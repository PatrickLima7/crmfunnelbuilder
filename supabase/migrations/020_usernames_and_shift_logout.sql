BEGIN;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS username text;
-- Stable, unique aliases for existing accounts. Their Auth email/password is unchanged.
DO $$
DECLARE person record; base text; candidate text;
BEGIN
  FOR person IN SELECT id, name FROM public.profiles WHERE username IS NULL ORDER BY created_at, id LOOP
    base := left(trim(both '.' from regexp_replace(translate(lower(person.name),
      'áàâãäéèêëíìîïóòôõöúùûüçñ', 'aaaaaeeeeiiiiooooouuuucn'), '[^a-z0-9]+', '.', 'g')), 32);
    IF base IS NULL OR length(base) < 3 THEN base := 'consultor'; END IF;
    candidate := base;
    IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(username) = candidate) THEN
      candidate := base || '.' || replace(person.id::text, '-', '');
    END IF;
    UPDATE public.profiles SET username = candidate WHERE id = person.id;
  END LOOP;
END;
$$;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_username_unique ON public.profiles (lower(username));
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_username_format;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_format
  CHECK (username IS NULL OR username ~ '^[a-z0-9][a-z0-9._-]{2,79}$');

CREATE OR REPLACE FUNCTION public.set_profile_username()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF NEW.username IS NULL THEN
    NEW.username := 'consultor.' || replace(NEW.id::text, '-', '');
  ELSE
    NEW.username := lower(trim(NEW.username));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS set_profile_username ON public.profiles;
CREATE TRIGGER set_profile_username BEFORE INSERT OR UPDATE OF username ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_profile_username();

-- Only the server may consume this rate limit; no account lookup is exposed to anon.
CREATE TABLE IF NOT EXISTS private.login_attempts (
  key text PRIMARY KEY,
  window_start timestamptz NOT NULL,
  attempts int NOT NULL
);
REVOKE ALL ON private.login_attempts FROM PUBLIC, anon, authenticated;
CREATE OR REPLACE FUNCTION public.consume_username_login_attempt(p_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE hits int;
BEGIN
  IF p_key !~ '^[a-f0-9]{64}$' THEN RETURN false; END IF;
  DELETE FROM private.login_attempts WHERE window_start < now() - interval '1 day';
  INSERT INTO private.login_attempts AS a (key, window_start, attempts)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    attempts = CASE WHEN a.window_start < now() - interval '5 minutes' THEN 1 ELSE a.attempts + 1 END,
    window_start = CASE WHEN a.window_start < now() - interval '5 minutes' THEN now() ELSE a.window_start END
  RETURNING attempts INTO hits;
  RETURN hits <= 20;
END;
$$;
REVOKE ALL ON FUNCTION public.consume_username_login_attempt(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_username_login_attempt(text) TO service_role;

ALTER TABLE public.operator_presence DROP CONSTRAINT IF EXISTS operator_presence_state_check;
ALTER TABLE public.operator_presence ADD CONSTRAINT operator_presence_state_check
  CHECK (state IN ('ligacao', 'whatsapp', 'ocioso', 'pausa', 'offline'));

-- Atomic and repeatable: close only the authenticated caller's work, before signOut.
CREATE OR REPLACE FUNCTION public.finish_own_shift(p_summary jsonb DEFAULT '{}'::jsonb, p_logout boolean DEFAULT false)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid(); stamp timestamptz := now(); log_row record;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '42501'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(uid::text, 0));
  UPDATE public.pause_events SET ended_at = stamp WHERE operator_id = uid AND ended_at IS NULL;
  FOR log_row IN SELECT * FROM public.expediente_logs WHERE operator_id = uid AND ended_at IS NULL FOR UPDATE LOOP
    UPDATE public.expediente_logs SET
      ended_at = stamp,
      duration_seconds = greatest(0, extract(epoch FROM stamp - log_row.started_at)::int),
      contacts_count = greatest(coalesce(log_row.contacts_count, 0), coalesce((p_summary->>'contacts_count')::int, 0),
        (SELECT count(*)::int FROM public.contact_events WHERE operator_id = uid AND started_at >= log_row.started_at)),
      conversions_count = greatest(coalesce(log_row.conversions_count, 0), coalesce((p_summary->>'conversions_count')::int, 0),
        (SELECT count(*)::int FROM public.contact_events WHERE operator_id = uid AND started_at >= log_row.started_at AND outcome = 'convertido')),
      talk_seconds = greatest(coalesce(log_row.talk_seconds, 0), coalesce((p_summary->>'talk_seconds')::int, 0),
        coalesce((SELECT sum(duration_seconds)::int FROM public.contact_events WHERE operator_id = uid AND started_at >= log_row.started_at), 0)),
      pause_seconds = coalesce((SELECT sum(greatest(0, extract(epoch FROM ended_at - greatest(started_at, log_row.started_at))))::int
        FROM public.pause_events WHERE operator_id = uid AND ended_at >= log_row.started_at), 0)
    WHERE id = log_row.id;
  END LOOP;
  UPDATE public.work_sessions SET ended_at = stamp WHERE operator_id = uid AND ended_at IS NULL;
  UPDATE public.operator_presence SET state = CASE WHEN p_logout THEN 'offline' ELSE 'ocioso' END,
    pause_reason = NULL, current_lead = NULL, updated_at = stamp WHERE operator_id = uid;
END;
$$;
REVOKE ALL ON FUNCTION public.finish_own_shift(jsonb, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_own_shift(jsonb, boolean) TO authenticated;

-- Attribution is stamped by the database, not supplied by the browser.
CREATE OR REPLACE FUNCTION public.audit_supervisor_lead_change()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF public.is_admin() AND OLD.assigned_to IS DISTINCT FROM auth.uid() THEN
    NEW.historico := CASE WHEN jsonb_typeof(NEW.historico) = 'array' THEN NEW.historico ELSE '[]'::jsonb END
      || jsonb_build_array(jsonb_build_object('ts', now(), 'acao', 'supervisao_admin', 'operador_id', auth.uid(),
           'detalhes', 'Alteração administrativa na carteira do consultor'));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS audit_supervisor_lead_change ON public.leads;
CREATE TRIGGER audit_supervisor_lead_change BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.audit_supervisor_lead_change();

CREATE OR REPLACE FUNCTION public.admin_append_lead_note(p_lead_id uuid, p_note text)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
BEGIN
  IF NOT public.is_admin() THEN RAISE EXCEPTION 'Acesso restrito' USING ERRCODE = '42501'; END IF;
  IF p_note IS NULL OR length(trim(p_note)) NOT BETWEEN 1 AND 5000 THEN RAISE EXCEPTION 'Orientação inválida'; END IF;
  UPDATE public.leads SET notes = concat_ws(E'\n\n', nullif(notes, ''), '[Orientação do administrador] ' || trim(p_note)), updated_at = now()
    WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead indisponível'; END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.admin_append_lead_note(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_append_lead_note(uuid, text) TO authenticated;
COMMIT;

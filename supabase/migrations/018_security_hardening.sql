-- Apply after 017. Existing accounts retain their active state.
BEGIN;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  -- Signup metadata is controlled by the caller. Only an admin can activate an account.
  INSERT INTO public.profiles (id, name, role, active)
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), 'operator', false);
  RETURN new;
END;
$$;
DROP POLICY IF EXISTS "user can insert own profile" ON public.profiles;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND active = true);
$$;

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;
CREATE OR REPLACE FUNCTION private.is_active_user()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = '' AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND active = true);
$$;
REVOKE ALL ON FUNCTION private.is_active_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_active_user() TO authenticated;

-- Restrictive policies AND with all existing permissive policies, including writes.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['goals','script_steps','operator_presence','work_sessions','pause_events','contact_events','leads','app_config','midias','pause_config','expediente_logs','cursos'] LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', t);
    EXECUTE format('DROP POLICY IF EXISTS active_account_required ON public.%I', t);
    EXECUTE format('CREATE POLICY active_account_required ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (private.is_active_user()) WITH CHECK (private.is_active_user())', t);
  END LOOP;
END;
$$;
REVOKE ALL ON TABLE public.profiles FROM anon;

DROP POLICY IF EXISTS "operator read assigned leads" ON public.leads;
CREATE POLICY "operator read assigned leads" ON public.leads FOR SELECT TO authenticated
  USING (auth.uid() = assigned_to);
DROP POLICY IF EXISTS "auth read expediente_logs" ON public.expediente_logs;
DROP POLICY IF EXISTS "operator read own expediente_logs" ON public.expediente_logs;
CREATE POLICY "operator read own expediente_logs" ON public.expediente_logs FOR SELECT TO authenticated
  USING (auth.uid() = operator_id OR public.is_admin());

-- The UI persists this field, but no earlier migration defines it.
ALTER TABLE public.contact_events ADD COLUMN IF NOT EXISTS motivo_desinteresse text;
CREATE OR REPLACE FUNCTION public.distribute_leads_batch(
  p_lead_ids UUID[],
  p_do_not_overwrite BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  total_updated INT,
  operator_count INT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_operators UUID[];
  v_op_count INT;
  v_updated_count INT := 0;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Acesso restrito a administradores ativos.' USING ERRCODE = '42501';
  END IF;
  -- Fetch active operators ordered deterministically by name and id
  SELECT ARRAY(
    SELECT id
    FROM public.profiles
    WHERE role = 'operator'
      AND (active IS NULL OR active = true)
    ORDER BY name, id
  ) INTO v_operators;

  v_op_count := array_length(v_operators, 1);

  IF v_op_count IS NULL OR v_op_count = 0 THEN
    RAISE EXCEPTION 'Nenhum consultor ativo encontrado para distribuiÃ§Ã£o.';
  END IF;

  -- Perform bulk update using CTE with ROW_NUMBER modulo operator count
  WITH eligible_leads AS (
    SELECT
      l.id,
      ROW_NUMBER() OVER (ORDER BY l.created_at DESC, l.id) - 1 AS idx
    FROM public.leads l
    WHERE l.id = ANY(p_lead_ids)
      AND (
        NOT p_do_not_overwrite
        OR l.assigned_to IS NULL
        OR l.assigned_to NOT IN (
          SELECT id FROM public.profiles WHERE role = 'operator' AND (active IS NULL OR active = true)
        )
      )
  ),
  assignments AS (
    SELECT
      el.id AS lead_id,
      v_operators[1 + (el.idx % v_op_count)] AS new_assigned_to
    FROM eligible_leads el
  ),
  updated AS (
    UPDATE public.leads l
    SET
      assigned_to = a.new_assigned_to,
      updated_at = NOW()
    FROM assignments a
    WHERE l.id = a.lead_id
    RETURNING l.id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated;

  RETURN QUERY SELECT v_updated_count, v_op_count;
END;
$$;

REVOKE ALL ON FUNCTION public.distribute_leads_batch(uuid[], boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.distribute_leads_batch(uuid[], boolean) TO authenticated;
COMMIT;

BEGIN;
-- Existing restrictive active-account policy still applies to this INSERT.
DROP POLICY IF EXISTS "operator insert own leads" ON public.leads;
CREATE POLICY "operator insert own leads" ON public.leads FOR INSERT TO authenticated
  WITH CHECK (assigned_to = auth.uid() AND private.is_active_user());

ALTER TABLE public.contact_events ADD COLUMN IF NOT EXISTS callback_at timestamptz;
ALTER TABLE public.contact_events DROP CONSTRAINT IF EXISTS contact_events_outcome_check;
ALTER TABLE public.contact_events ADD CONSTRAINT contact_events_outcome_check CHECK (outcome IN (
  'interessado','pensar','nao','sem_resposta','revisao','retorno','errado','convertido',
  'sem_interesse','numero_invalido','em_nutricao','agendado','desligou'));
-- Enforce new writes without inventing dates for historical records.
ALTER TABLE public.contact_events DROP CONSTRAINT IF EXISTS contact_callback_required;
ALTER TABLE public.contact_events ADD CONSTRAINT contact_callback_required CHECK (
  outcome NOT IN ('interessado','pensar','retorno','desligou') OR
  (callback_at IS NOT NULL AND isfinite(callback_at))) NOT VALID;

CREATE OR REPLACE FUNCTION public.finish_lead_call(
  p_event_id uuid, p_lead_id uuid, p_outcome text, p_started_at timestamptz,
  p_callback_at timestamptz DEFAULT NULL, p_reason text DEFAULT NULL,
  p_session_id uuid DEFAULT NULL, p_contact_type text DEFAULT 'call'
) RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
DECLARE uid uuid := auth.uid(); current_lead public.leads%ROWTYPE; stamp timestamptz := now();
BEGIN
  IF uid IS NULL OR NOT private.is_active_user() THEN
    RAISE EXCEPTION 'Autenticação ativa obrigatória' USING ERRCODE = '42501';
  END IF;
  IF p_event_id IS NULL OR p_started_at IS NULL OR NOT isfinite(p_started_at) OR p_started_at > stamp THEN
    RAISE EXCEPTION 'Atendimento inválido';
  END IF;
  IF p_outcome IS NULL OR p_outcome NOT IN ('convertido','interessado','pensar','retorno','desligou','sem_interesse','sem_resposta','em_nutricao','numero_invalido') THEN
    RAISE EXCEPTION 'Resultado inválido';
  END IF;
  IF (p_outcome IN ('interessado','pensar','retorno','desligou') AND p_callback_at IS NULL)
     OR (p_callback_at IS NOT NULL AND NOT isfinite(p_callback_at)) THEN
    RAISE EXCEPTION 'Confirme data e hora do retorno';
  END IF;
  IF p_outcome = 'sem_interesse' AND coalesce(length(trim(p_reason)),0) = 0 THEN
    RAISE EXCEPTION 'Informe o motivo do desinteresse';
  END IF;
  IF p_session_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.work_sessions WHERE id = p_session_id AND operator_id = uid) THEN
    RAISE EXCEPTION 'Sessão inválida' USING ERRCODE = '42501';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_event_id::text, 0));
  IF EXISTS (SELECT 1 FROM public.contact_events WHERE id = p_event_id AND operator_id = uid) THEN RETURN; END IF;
  SELECT * INTO current_lead FROM public.leads WHERE id = p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead indisponível' USING ERRCODE = '42501'; END IF;
  UPDATE public.leads SET
    status = CASE p_outcome WHEN 'convertido' THEN 'converted' WHEN 'sem_interesse' THEN 'blacklisted'
      WHEN 'numero_invalido' THEN 'inactive' WHEN 'em_nutricao' THEN 'em_nutricao' ELSE 'contacted' END,
    temperature = CASE WHEN p_outcome IN ('convertido','interessado') THEN 'quente'
      WHEN p_outcome IN ('pensar','retorno','em_nutricao') THEN 'morno' ELSE 'frio' END,
    callback_at = CASE WHEN p_outcome IN ('sem_interesse','numero_invalido') THEN NULL ELSE p_callback_at END,
    updated_at = stamp, data_ultimo_contato = stamp,
    historico = coalesce(current_lead.historico, '[]'::jsonb) || jsonb_build_array(jsonb_build_object(
      'ts',stamp,'acao','resultado_ligacao','detalhes',p_outcome,'operador_id',uid,'callback_at',p_callback_at))
    WHERE id = p_lead_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Sem permissão para atualizar o lead' USING ERRCODE = '42501'; END IF;
  INSERT INTO public.contact_events(id,operator_id,session_id,lead_name,lead_phone,contact_type,outcome,
    motivo_desinteresse,started_at,ended_at,callback_at)
    VALUES(p_event_id,uid,p_session_id,current_lead.name,current_lead.phone,p_contact_type,p_outcome,
      p_reason,p_started_at,stamp,p_callback_at);
END;
$$;
REVOKE ALL ON FUNCTION public.finish_lead_call(uuid,uuid,text,timestamptz,timestamptz,text,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finish_lead_call(uuid,uuid,text,timestamptz,timestamptz,text,uuid,text) TO authenticated;

-- Administrators can edit this JSON through Table Editor without changing code.
INSERT INTO public.app_config(key,value) VALUES ('insight_messages', '[
 {"category":"motivacional","text":"Cada conversa é uma nova oportunidade. Escute com atenção e avance um passo de cada vez."},
 {"category":"tecnica","text":"Antes de apresentar uma proposta, confirme a necessidade e o objetivo do cliente."},
 {"category":"operacao","text":"Retornos pendentes incluem hoje e datas anteriores. Use Retornos futuros para planejar os próximos dias."},
 {"category":"motivacional","text":"Consistência faz diferença: mantenha seus retornos organizados e valorize cada progresso."},
 {"category":"tecnica","text":"Ao combinar um retorno, confirme com o cliente a data, o horário e o próximo passo."},
 {"category":"operacao","text":"Novo lead tem prioridade Super quente. Registre o atendimento para manter a carteira atualizada."}
]'::jsonb) ON CONFLICT (key) DO NOTHING;
COMMIT;

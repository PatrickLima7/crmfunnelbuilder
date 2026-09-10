-- Migration 013: Garantir coluna callback_at e criar tabela expediente_logs
-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. Garante a coluna callback_at na tabela leads
ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS callback_at timestamptz;

COMMENT ON COLUMN public.leads.callback_at IS 'Data e hora agendada para retorno de ligação com o cliente';

-- 2. Tabela de Logs de Expediente
CREATE TABLE IF NOT EXISTS public.expediente_logs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id        uuid REFERENCES public.work_sessions(id),
  started_at        timestamptz NOT NULL DEFAULT now(),
  ended_at          timestamptz,
  duration_seconds  int DEFAULT 0,
  contacts_count    int DEFAULT 0,
  conversions_count int DEFAULT 0,
  talk_seconds      int DEFAULT 0,
  pause_seconds     int DEFAULT 0,
  summary_json      jsonb DEFAULT '{}'::jsonb,
  created_at        timestamptz DEFAULT now()
);

COMMENT ON TABLE public.expediente_logs IS 'Histórico consolidado de expedientes/turnos dos vendedores';

-- 3. RLS para expediente_logs
ALTER TABLE public.expediente_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read expediente_logs" ON public.expediente_logs;
CREATE POLICY "auth read expediente_logs" ON public.expediente_logs
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "operator insert own expediente_logs" ON public.expediente_logs;
CREATE POLICY "operator insert own expediente_logs" ON public.expediente_logs
  FOR INSERT WITH CHECK (auth.uid() = operator_id);

DROP POLICY IF EXISTS "operator update own expediente_logs" ON public.expediente_logs;
CREATE POLICY "operator update own expediente_logs" ON public.expediente_logs
  FOR UPDATE USING (auth.uid() = operator_id);

DROP POLICY IF EXISTS "admin delete expediente_logs" ON public.expediente_logs;
CREATE POLICY "admin delete expediente_logs" ON public.expediente_logs
  FOR ALL USING (public.is_admin());

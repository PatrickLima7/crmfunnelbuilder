-- Migration 008: Sprint 3 — Configuração de pausas individualizadas
-- Execute no Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.pause_config (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome           text NOT NULL UNIQUE,
  max_minutes    int NOT NULL DEFAULT 15,
  ativo          boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.pause_config (nome, max_minutes) VALUES
  ('Almoço', 60), ('Café', 15), ('Banheiro', 10), ('Reunião', 30), ('Treinamento', 30), ('Médico', 60)
ON CONFLICT DO NOTHING;

ALTER TABLE public.pause_config ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read pause_config" ON public.pause_config FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin write pause_config" ON public.pause_config FOR ALL USING (public.is_admin());

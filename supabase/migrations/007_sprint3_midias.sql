-- Migration 007: Sprint 3 — Tabela de Mídias (CRUD)
-- Execute no Supabase Dashboard > SQL Editor

CREATE TABLE IF NOT EXISTS public.midias (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL UNIQUE,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Seed inicial
INSERT INTO public.midias (nome) VALUES
  ('Instagram'),('Facebook'),('LinkedIn'),('Google Ads'),
  ('Site / Landing Page'),('Indicação'),('WhatsApp'),('Telefone receptivo'),
  ('Evento / Feira'),('Outro')
ON CONFLICT DO NOTHING;

-- RLS
ALTER TABLE public.midias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "auth read midias" ON public.midias FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "admin write midias" ON public.midias FOR ALL USING (public.is_admin());

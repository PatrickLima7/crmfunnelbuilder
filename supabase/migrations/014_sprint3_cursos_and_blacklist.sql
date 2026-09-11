-- Migration 014: Entidade Cursos (CRUD) + Status Blacklist em Leads
-- Execute este script no Supabase Dashboard > SQL Editor

-- 1. Tabela de Cursos
CREATE TABLE IF NOT EXISTS public.cursos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL UNIQUE,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cursos IS 'Tabela de cursos cadastrados para seleção na captação de leads';

-- Seed inicial obrigatório: "Não identificado"
INSERT INTO public.cursos (nome) VALUES ('Não identificado')
ON CONFLICT (nome) DO NOTHING;

-- Seed de cursos de exemplo recomendados
INSERT INTO public.cursos (nome) VALUES
  ('MBA em Gestão Estratégica'),
  ('Engenharia de Software'),
  ('Direito Tributário'),
  ('Design de Interiores'),
  ('Gestão Financeira')
ON CONFLICT (nome) DO NOTHING;

-- RLS para tabela cursos
ALTER TABLE public.cursos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth read cursos" ON public.cursos;
CREATE POLICY "auth read cursos" ON public.cursos
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "admin write cursos" ON public.cursos;
CREATE POLICY "admin write cursos" ON public.cursos
  FOR ALL USING (public.is_admin());

-- 2. Adicionar 'blacklisted' ao status de leads
ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('pending','contacted','converted','inactive','em_nutricao','blacklisted'));

COMMENT ON COLUMN public.leads.status IS 'Status do lead: pending, contacted, converted, inactive, em_nutricao, blacklisted';

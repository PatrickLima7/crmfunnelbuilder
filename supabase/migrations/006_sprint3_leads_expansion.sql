-- Migration 006: Sprint 3 — Expand leads table with new fields
-- Execute no Supabase Dashboard > SQL Editor

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS historico           jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS midia               text,
  ADD COLUMN IF NOT EXISTS campanha            text,
  ADD COLUMN IF NOT EXISTS curso               text,
  ADD COLUMN IF NOT EXISTS data_nascimento     date,
  ADD COLUMN IF NOT EXISTS genero              text,
  ADD COLUMN IF NOT EXISTS cep                 text,
  ADD COLUMN IF NOT EXISTS data_primeiro_cadastro timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS data_ultimo_cadastro   timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS data_ultimo_contato    timestamptz;

COMMENT ON COLUMN public.leads.historico IS 'Log automático de interações [{ts, acao, operador_id, detalhes}]';
COMMENT ON COLUMN public.leads.midia IS 'Tipo de mídia de origem (referência tabela midias)';
COMMENT ON COLUMN public.leads.campanha IS 'Campanha de marketing de origem';
COMMENT ON COLUMN public.leads.curso IS 'Curso de interesse do lead';
COMMENT ON COLUMN public.leads.data_nascimento IS 'Data de nascimento do lead';
COMMENT ON COLUMN public.leads.genero IS 'Gênero do lead';
COMMENT ON COLUMN public.leads.cep IS 'CEP do lead';
COMMENT ON COLUMN public.leads.data_primeiro_cadastro IS 'Data do primeiro cadastro — imutável';
COMMENT ON COLUMN public.leads.data_ultimo_cadastro IS 'Atualizada a cada novo cadastro/reimportação';
COMMENT ON COLUMN public.leads.data_ultimo_contato IS 'Atualizada em cada interação';

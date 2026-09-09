-- Migration 011: Sprint 3 — Adicionar colunas restantes da estrutura oficial de leads
-- Execute no Supabase Dashboard > SQL Editor

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS hr_para_contato text,
  ADD COLUMN IF NOT EXISTS dt_matricula     date,
  ADD COLUMN IF NOT EXISTS informacao       text,
  ADD COLUMN IF NOT EXISTS observacao       text,
  ADD COLUMN IF NOT EXISTS detalhes         text,
  ADD COLUMN IF NOT EXISTS telefone_3       text,
  ADD COLUMN IF NOT EXISTS telefone_4       text,
  ADD COLUMN IF NOT EXISTS identificacao    text;

COMMENT ON COLUMN public.leads.hr_para_contato IS 'Horário preferencial para contato';
COMMENT ON COLUMN public.leads.dt_matricula IS 'Data de matrícula do aluno/cliente';
COMMENT ON COLUMN public.leads.informacao IS 'Informações adicionais do lead';
COMMENT ON COLUMN public.leads.observacao IS 'Observação final do lead';
COMMENT ON COLUMN public.leads.detalhes IS 'Detalhes adicionais do atendimento';
COMMENT ON COLUMN public.leads.telefone_3 IS 'Telefone secundário 3';
COMMENT ON COLUMN public.leads.telefone_4 IS 'Telefone secundário 4';
COMMENT ON COLUMN public.leads.identificacao IS 'Código de identificação externa do lead';

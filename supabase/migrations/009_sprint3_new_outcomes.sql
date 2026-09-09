-- Migration 009: Sprint 3 — Novos outcomes de contato + motivo desinteresse
-- Execute no Supabase Dashboard > SQL Editor

ALTER TABLE public.contact_events DROP CONSTRAINT IF EXISTS contact_events_outcome_check;
ALTER TABLE public.contact_events
  ADD CONSTRAINT contact_events_outcome_check
  CHECK (outcome IN (
    'interessado','pensar','nao','sem_resposta','revisao','retorno','errado',
    'convertido','sem_interesse','numero_invalido','em_nutricao','agendado'
  ));

-- Campo de motivo obrigatório para "sem_interesse"
ALTER TABLE public.contact_events
  ADD COLUMN IF NOT EXISTS motivo_desinteresse text;

COMMENT ON COLUMN public.contact_events.motivo_desinteresse IS 'Motivo obrigatório quando outcome = sem_interesse';

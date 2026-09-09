-- Migration 010: Sprint 3 — Adicionar status em_nutricao aos leads
-- Execute no Supabase Dashboard > SQL Editor

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('pending','contacted','converted','inactive','em_nutricao'));

COMMENT ON TABLE public.leads IS 'Leads do CRM com status: pending, contacted, converted, inactive, em_nutricao';

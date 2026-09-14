-- Migration 015: Novo Lead status no ciclo de vida
-- Execute no Supabase Dashboard > SQL Editor

ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_status_check;
ALTER TABLE public.leads
  ADD CONSTRAINT leads_status_check
  CHECK (status IN ('pending', 'novo', 'contacted', 'converted', 'inactive', 'em_nutricao', 'blacklisted'));

-- Converter leads recém-criados ou pendentes para 'novo'
UPDATE public.leads
SET status = 'novo'
WHERE status = 'pending';

COMMENT ON COLUMN public.leads.status IS 'Status do lead: novo, contacted, converted, inactive, em_nutricao, blacklisted, pending';

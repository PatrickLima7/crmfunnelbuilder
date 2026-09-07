-- Migration 004: Expand leads table with full contact fields
-- Execute no Supabase Dashboard > SQL Editor

ALTER TABLE public.leads
  ADD COLUMN IF NOT EXISTS phone2      text,
  ADD COLUMN IF NOT EXISTS cpf         text,
  ADD COLUMN IF NOT EXISTS city        text,
  ADD COLUMN IF NOT EXISTS state       text,
  ADD COLUMN IF NOT EXISTS profession  text,
  ADD COLUMN IF NOT EXISTS company     text,
  ADD COLUMN IF NOT EXISTS origin      text NOT NULL DEFAULT 'manual'
    CHECK (origin IN ('instagram','facebook','linkedin','site','indicacao','whatsapp','telefone','evento','csv','outro','manual'));

COMMENT ON COLUMN public.leads.phone2      IS 'Telefone secundário / celular';
COMMENT ON COLUMN public.leads.cpf         IS 'CPF do lead (opcional)';
COMMENT ON COLUMN public.leads.city        IS 'Cidade do lead';
COMMENT ON COLUMN public.leads.state       IS 'Estado (UF) do lead';
COMMENT ON COLUMN public.leads.profession  IS 'Profissão ou cargo';
COMMENT ON COLUMN public.leads.company     IS 'Empresa onde o lead trabalha';
COMMENT ON COLUMN public.leads.origin      IS 'Origem / fonte do lead';

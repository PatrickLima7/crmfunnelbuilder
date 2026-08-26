-- Migration 002: Add temperature column to leads
-- Execute no Supabase Dashboard > SQL Editor

ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS temperature text NOT NULL DEFAULT 'morno' 
CHECK (temperature IN ('quente', 'morno', 'frio'));

COMMENT ON COLUMN public.leads.temperature IS 'Temperatura do lead: quente, morno ou frio';

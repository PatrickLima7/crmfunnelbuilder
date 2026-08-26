-- Migration 003: Add callback_at column to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS callback_at timestamptz;

COMMENT ON COLUMN public.leads.callback_at IS 'Data e hora agendada para retorno de ligação com o cliente';

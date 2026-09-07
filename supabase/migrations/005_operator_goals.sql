-- Migration 005: Individual operator goals + retorno outcome in contact_events
-- Execute no Supabase Dashboard > SQL Editor

-- 1. Adicionar metas individuais na tabela profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_contacts_goal    int DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS daily_conversions_goal int DEFAULT NULL;

COMMENT ON COLUMN public.profiles.daily_contacts_goal    IS 'Meta individual de contatos/dia. NULL = usa meta global.';
COMMENT ON COLUMN public.profiles.daily_conversions_goal IS 'Meta individual de conversoes/dia. NULL = usa meta global.';

-- 2. Adicionar 'retorno' como outcome valido em contact_events
-- Precisamos recriar a constraint de check
ALTER TABLE public.contact_events DROP CONSTRAINT IF EXISTS contact_events_outcome_check;
ALTER TABLE public.contact_events
  ADD CONSTRAINT contact_events_outcome_check
  CHECK (outcome IN ('interessado','pensar','nao','sem_resposta','revisao','retorno','errado'));

-- 3. Permitir operadores inserir leads atribuidos a si mesmos (para cadastro manual)
DROP POLICY IF EXISTS "operator insert own leads" ON public.leads;
CREATE POLICY "operator insert own leads" ON public.leads
  FOR INSERT WITH CHECK (auth.uid() = assigned_to);

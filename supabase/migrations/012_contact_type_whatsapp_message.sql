-- Migration 012: Add whatsapp_message to contact_events.contact_type
-- Execute no Supabase Dashboard > SQL Editor

ALTER TABLE public.contact_events
  DROP CONSTRAINT IF EXISTS contact_events_contact_type_check;

ALTER TABLE public.contact_events
  ADD CONSTRAINT contact_events_contact_type_check
  CHECK (contact_type IN ('call', 'whatsapp', 'whatsapp_message'));

COMMENT ON COLUMN public.contact_events.contact_type IS
  'Tipo de contato: call=ligação telefônica, whatsapp=ligação WhatsApp, whatsapp_message=mensagem WhatsApp';

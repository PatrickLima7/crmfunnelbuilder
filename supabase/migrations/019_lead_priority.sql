-- New lead is an explicit intake state, not a synonym for pending.
BEGIN;

CREATE OR REPLACE FUNCTION public.classify_incoming_lead()
RETURNS trigger LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  -- Normal manual/campaign intake. CSV must explicitly send status = 'novo'
  -- when the person importing opts in; the default remains pending.
  IF NEW.status = 'pending' AND (
    NEW.origin = 'manual' OR
    NEW.origin IN ('instagram', 'facebook', 'linkedin', 'site')
  ) THEN
    NEW.status := 'novo';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS classify_incoming_lead ON public.leads;
CREATE TRIGGER classify_incoming_lead BEFORE INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.classify_incoming_lead();

-- Repair only identifiable legacy bulk imports from the old UI, which marked
-- every CSV row as new. Preserve manually re-registered and explicitly new rows.
UPDATE public.leads AS l
SET status = 'pending', updated_at = now(),
    historico = l.historico || jsonb_build_array(jsonb_build_object(
      'ts', now(), 'acao', 'correcao_prioridade_csv',
      'detalhes', 'Importação antiga sem marcação explícita de novo lead; movida para carteira.'
    ))
WHERE l.origin = 'csv' AND l.status = 'novo'
  AND jsonb_typeof(l.historico) = 'array'
  AND l.historico @> '[{"acao":"importacao_csv","detalhes":"Importado via CSV"}]'::jsonb
  AND NOT l.historico @> '[{"acao":"recadastro"}]'::jsonb
  AND NOT l.historico @> '[{"acao":"cadastro_manual"}]'::jsonb
  AND NOT l.historico @> '[{"acao":"importacao_csv","detalhes":"Importado via CSV como novo lead"}]'::jsonb;

-- Realtime is an optimization; the UI also polls every 15 seconds.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime'
                     AND schemaname = 'public' AND tablename = 'leads') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.leads;
  END IF;
END;
$$;
COMMIT;

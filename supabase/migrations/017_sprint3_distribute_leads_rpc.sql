-- Migration 017: High-Performance Automatic Lead Distribution RPC Function & Indexes
-- Execute no Supabase Dashboard > SQL Editor

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS active boolean NOT NULL DEFAULT true;

-- 1. Create Indexes for High-Performance Queries
CREATE INDEX IF NOT EXISTS idx_leads_assigned_to ON public.leads (assigned_to);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads (status);
CREATE INDEX IF NOT EXISTS idx_profiles_role_active ON public.profiles (role, active);

-- 2. Create RPC Function for Single-Query Atomic Lead Distribution
CREATE OR REPLACE FUNCTION public.distribute_leads_batch(
  p_lead_ids UUID[],
  p_do_not_overwrite BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
  total_updated INT,
  operator_count INT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_operators UUID[];
  v_op_count INT;
  v_updated_count INT := 0;
BEGIN
  -- Fetch active operators ordered deterministically by name and id
  SELECT ARRAY(
    SELECT id 
    FROM public.profiles 
    WHERE role = 'operator' 
      AND (active IS NULL OR active = true)
    ORDER BY name, id
  ) INTO v_operators;

  v_op_count := array_length(v_operators, 1);

  IF v_op_count IS NULL OR v_op_count = 0 THEN
    RAISE EXCEPTION 'Nenhum consultor ativo encontrado para distribuição.';
  END IF;

  -- Perform bulk update using CTE with ROW_NUMBER modulo operator count
  WITH eligible_leads AS (
    SELECT 
      l.id,
      ROW_NUMBER() OVER (ORDER BY l.created_at DESC, l.id) - 1 AS idx
    FROM public.leads l
    WHERE l.id = ANY(p_lead_ids)
      AND (
        NOT p_do_not_overwrite 
        OR l.assigned_to IS NULL 
        OR l.assigned_to NOT IN (
          SELECT id FROM public.profiles WHERE role = 'operator' AND (active IS NULL OR active = true)
        )
      )
  ),
  assignments AS (
    SELECT 
      el.id AS lead_id,
      v_operators[1 + (el.idx % v_op_count)] AS new_assigned_to
    FROM eligible_leads el
  ),
  updated AS (
    UPDATE public.leads l
    SET 
      assigned_to = a.new_assigned_to,
      updated_at = NOW()
    FROM assignments a
    WHERE l.id = a.lead_id
    RETURNING l.id
  )
  SELECT COUNT(*) INTO v_updated_count FROM updated;

  RETURN QUERY SELECT v_updated_count, v_op_count;
END;
$$;

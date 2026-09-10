import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ExpedienteLog } from "@/lib/supabase-types";
import { toast } from "sonner";

export const EXPEDIENTE_QUERY_KEY = ["expediente_logs"];

export interface ExpedienteSummary {
  contacts_count: number;
  conversions_count: number;
  talk_seconds: number;
  pause_seconds: number;
  outcomes_breakdown?: Record<string, number>;
}

export function useActiveExpediente(operatorId: string) {
  return useQuery({
    queryKey: [...EXPEDIENTE_QUERY_KEY, "active", operatorId],
    queryFn: async (): Promise<ExpedienteLog | null> => {
      const { data, error } = await supabase
        .from("expediente_logs")
        .select("*")
        .eq("operator_id", operatorId)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1);

      if (error && error.code !== "PGRST116") throw error;
      return data && data.length > 0 ? data[0]! : null;
    },
    enabled: !!operatorId,
  });
}

export function useStartExpediente(operatorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      // 1. Close any stale un-ended expediente for this operator first
      const nowIso = new Date().toISOString();
      await supabase
        .from("expediente_logs")
        .update({ ended_at: nowIso })
        .eq("operator_id", operatorId)
        .is("ended_at", null);

      // 2. Create work_session if none exists today
      const todayDate = nowIso.slice(0, 10);
      let sessionId: string | null = null;

      const { data: existingSession } = await supabase
        .from("work_sessions")
        .select("id")
        .eq("operator_id", operatorId)
        .eq("date", todayDate)
        .maybeSingle();

      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        const { data: newSession } = await supabase
          .from("work_sessions")
          .insert({ operator_id: operatorId, date: todayDate, started_at: nowIso })
          .select("id")
          .single();
        if (newSession) sessionId = newSession.id;
      }

      // 3. Create new expediente log
      const { data: log, error } = await supabase
        .from("expediente_logs")
        .insert({
          operator_id: operatorId,
          session_id: sessionId,
          started_at: nowIso,
          contacts_count: 0,
          conversions_count: 0,
          talk_seconds: 0,
          pause_seconds: 0,
          summary_json: { started_by_user: true },
        })
        .select()
        .single();

      if (error) throw error;

      // 4. Update operator_presence to reset today's counters for this new shift
      await supabase
        .from("operator_presence")
        .update({
          state: "ocioso",
          contacts_today: 0,
          conversions_today: 0,
          talk_seconds: 0,
          pause_seconds: 0,
          pause_reason: null,
          current_lead: null,
          updated_at: nowIso,
        })
        .eq("operator_id", operatorId);

      return log;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXPEDIENTE_QUERY_KEY });
      toast.success("Expediente iniciado com sucesso! Boas vendas!");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao iniciar expediente: ${err.message}`);
    },
  });
}

export function useFinishExpediente(operatorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (summary: ExpedienteSummary) => {
      const nowIso = new Date().toISOString();

      // Find active expediente
      const { data: activeLog } = await supabase
        .from("expediente_logs")
        .select("*")
        .eq("operator_id", operatorId)
        .is("ended_at", null)
        .order("started_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeLog) {
        const startMs = new Date(activeLog.started_at).getTime();
        const durationSec = Math.max(1, Math.floor((new Date().getTime() - startMs) / 1000));

        const { error } = await supabase
          .from("expediente_logs")
          .update({
            ended_at: nowIso,
            duration_seconds: durationSec,
            contacts_count: summary.contacts_count,
            conversions_count: summary.conversions_count,
            talk_seconds: summary.talk_seconds,
            pause_seconds: summary.pause_seconds,
            summary_json: (summary.outcomes_breakdown ?? {}) as any,
          })
          .eq("id", activeLog.id);

        if (error) throw error;
      }

      // Update presence to ocioso
      await supabase
        .from("operator_presence")
        .update({
          state: "ocioso",
          current_lead: null,
          pause_reason: null,
          updated_at: nowIso,
        })
        .eq("operator_id", operatorId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: EXPEDIENTE_QUERY_KEY });
      toast.success("Expediente finalizado! Log do dia registrado com sucesso.");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao finalizar expediente: ${err.message}`);
    },
  });
}

export function useAllExpedienteLogs() {
  return useQuery({
    queryKey: [...EXPEDIENTE_QUERY_KEY, "admin_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expediente_logs")
        .select(`
          *,
          operator:profiles!operator_id (id, name, email)
        `)
        .order("started_at", { ascending: false });

      if (error) throw error;
      return data ?? [];
    },
  });
}

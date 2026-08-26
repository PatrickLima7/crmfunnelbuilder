import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ScriptStepRow } from "@/lib/supabase-types";
import { toast } from "sonner";

export const SCRIPT_QUERY_KEY = ["script_steps"];

/** Fetch all script steps ordered by position */
export function useScript() {
  return useQuery({
    queryKey: SCRIPT_QUERY_KEY,
    queryFn: async (): Promise<ScriptStepRow[]> => {
      const { data, error } = await supabase
        .from("script_steps")
        .select("*")
        .order("position");
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 30_000,
  });
}

/** Save the full script (replace all steps) */
export function useSaveScript() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (steps: Array<Omit<ScriptStepRow, "id" | "updated_at"> & { id?: string }>) => {
      // Upsert all steps
      const now = new Date().toISOString();
      const rows = steps.map((s, i) => ({
        ...s,
        position: i + 1,
        updated_at: now,
      }));

      // Delete steps that were removed
      const keepIds = rows.filter((r) => r.id).map((r) => r.id!);
      if (keepIds.length > 0) {
        await supabase.from("script_steps").delete().not("id", "in", `(${keepIds.join(",")})`);
      } else {
        await supabase.from("script_steps").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      }

      // Upsert remaining
      for (const row of rows) {
        if (row.id) {
          const { error } = await supabase
            .from("script_steps")
            .update({ title: row.title, checklist: row.checklist, speech: row.speech, note_label: row.note_label, position: row.position, updated_at: now })
            .eq("id", row.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("script_steps")
            .insert({ title: row.title, checklist: row.checklist, speech: row.speech, note_label: row.note_label, position: row.position });
          if (error) throw error;
        }
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: SCRIPT_QUERY_KEY });
      toast.success("Script publicado para os operadores.");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar script: ${err.message}`);
    },
  });
}

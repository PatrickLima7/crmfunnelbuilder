import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Goals } from "@/lib/supabase-types";
import { toast } from "sonner";

export const GOALS_QUERY_KEY = ["goals"];

/** Fetch the current team goals */
export function useGoals() {
  return useQuery({
    queryKey: GOALS_QUERY_KEY,
    queryFn: async (): Promise<Goals> => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();
      if (error) throw error;
      return data;
    },
    staleTime: 60_000, // Re-fetch after 1 min
  });
}

/** Save updated goals (admin only) */
export function useSaveGoals() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (goals: Partial<Omit<Goals, "id" | "updated_at" | "updated_by">>) => {
      // Get current user for updated_by
      const { data: { user } } = await supabase.auth.getUser();

      // Get existing row id
      const { data: existing } = await supabase
        .from("goals")
        .select("id")
        .limit(1)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("goals")
          .update({ ...goals, updated_by: user?.id ?? null, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("goals")
          .insert({ ...goals, updated_by: user?.id ?? null });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
      toast.success("Metas atualizadas para toda a equipe.");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao salvar metas: ${err.message}`);
    },
  });
}

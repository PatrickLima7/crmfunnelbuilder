import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { PAUSE_REASONS } from "@/lib/crm-data";

/** Fetch pause types from app_config, fallback to static list */
export function usePauseTypes() {
  return useQuery({
    queryKey: ["app_config", "pause_types"],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from("app_config")
        .select("value")
        .eq("key", "pause_types")
        .single();
      if (error || !data) return [...PAUSE_REASONS];
      return data.value as string[];
    },
    staleTime: 60_000,
  });
}

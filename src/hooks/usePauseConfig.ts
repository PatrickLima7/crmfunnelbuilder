import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface PauseConfigItem {
  id: string;
  nome: string;
  max_minutes: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const PAUSE_CONFIG_QUERY_KEY = ["pause_config"];

export function usePauseConfig() {
  return useQuery({
    queryKey: PAUSE_CONFIG_QUERY_KEY,
    queryFn: async (): Promise<PauseConfigItem[]> => {
      const { data, error } = await supabase
        .from("pause_config")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useActivePauseTypes() {
  return useQuery({
    queryKey: [...PAUSE_CONFIG_QUERY_KEY, "active"],
    queryFn: async (): Promise<PauseConfigItem[]> => {
      const { data, error } = await supabase
        .from("pause_config")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePauseType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ nome, max_minutes }: { nome: string; max_minutes: number }) => {
      const { data, error } = await supabase
        .from("pause_config")
        .insert({ nome, max_minutes })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: PAUSE_CONFIG_QUERY_KEY });
      toast.success(`Tipo de pausa "${data.nome}" criado!`);
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });
}

export function useUpdatePauseType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<PauseConfigItem> }) => {
      const { id: _, created_at: __, ...cleanUpdates } = updates as any;
      const { error } = await supabase
        .from("pause_config")
        .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAUSE_CONFIG_QUERY_KEY });
      toast.success("Tipo de pausa atualizado.");
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });
}

export function useDeletePauseType() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("pause_config")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: PAUSE_CONFIG_QUERY_KEY });
      toast.success("Tipo de pausa removido.");
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });
}

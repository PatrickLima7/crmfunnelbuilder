import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface Midia {
  id: string;
  nome: string;
  ativo: boolean;
  created_at: string;
  updated_at: string;
}

export const MIDIAS_QUERY_KEY = ["midias"];

export function useMidias() {
  return useQuery({
    queryKey: MIDIAS_QUERY_KEY,
    queryFn: async (): Promise<Midia[]> => {
      const { data, error } = await supabase
        .from("midias")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useActiveMidias() {
  return useQuery({
    queryKey: [...MIDIAS_QUERY_KEY, "active"],
    queryFn: async (): Promise<Midia[]> => {
      const { data, error } = await supabase
        .from("midias")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateMidia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const { data, error } = await supabase
        .from("midias")
        .insert({ nome })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: MIDIAS_QUERY_KEY });
      toast.success(`Mídia "${data.nome}" criada!`);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao criar mídia: ${err.message}`);
    },
  });
}

export function useUpdateMidia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Midia> }) => {
      const { id: _, created_at: __, ...cleanUpdates } = updates as any;
      const { error } = await supabase
        .from("midias")
        .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MIDIAS_QUERY_KEY });
      toast.success("Mídia atualizada.");
    },
    onError: (err: Error) => {
      toast.error(`Erro: ${err.message}`);
    },
  });
}

export function useDeleteMidia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("midias")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: MIDIAS_QUERY_KEY });
      toast.success("Mídia removida.");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao remover: ${err.message}`);
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Curso } from "@/lib/supabase-types";
import { toast } from "sonner";

export const CURSOS_QUERY_KEY = ["cursos"];
export const DEFAULT_CURSO_NAME = "Não identificado";

export function useCursos() {
  return useQuery({
    queryKey: CURSOS_QUERY_KEY,
    queryFn: async (): Promise<Curso[]> => {
      const { data, error } = await supabase
        .from("cursos")
        .select("*")
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useActiveCursos() {
  return useQuery({
    queryKey: [...CURSOS_QUERY_KEY, "active"],
    queryFn: async (): Promise<Curso[]> => {
      const { data, error } = await supabase
        .from("cursos")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreateCurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (nome: string) => {
      const trimmed = nome.trim();
      if (!trimmed) throw new Error("O nome do curso é obrigatório.");
      const { data, error } = await supabase
        .from("cursos")
        .insert({ nome: trimmed })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: CURSOS_QUERY_KEY });
      toast.success(`Curso "${data.nome}" criado com sucesso!`);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao criar curso: ${err.message}`);
    },
  });
}

export function useUpdateCurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: { nome?: string; ativo?: boolean } }) => {
      const { error } = await supabase
        .from("cursos")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURSOS_QUERY_KEY });
      toast.success("Curso atualizado com sucesso.");
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar curso: ${err.message}`);
    },
  });
}

export function useDeleteCurso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (curso: { id: string; nome: string }) => {
      if (curso.nome.trim().toLowerCase() === DEFAULT_CURSO_NAME.toLowerCase()) {
        throw new Error(`O curso padrão "${DEFAULT_CURSO_NAME}" não pode ser excluído do sistema.`);
      }
      const { error } = await supabase
        .from("cursos")
        .delete()
        .eq("id", curso.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CURSOS_QUERY_KEY });
      toast.success("Curso removido com sucesso.");
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

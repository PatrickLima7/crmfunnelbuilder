import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/supabase-types";
import { toast } from "sonner";

export const LEADS_QUERY_KEY = ["leads"];

/** Fetch leads assigned to this operator */
export function useLeads(operatorId: string) {
  return useQuery({
    queryKey: [...LEADS_QUERY_KEY, operatorId],
    queryFn: async (): Promise<Lead[]> => {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("assigned_to", operatorId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!operatorId,
  });
}

/** Register a new lead assigned to this operator */
export function useCreateLead(operatorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: {
      name: string;
      phone: string;
      email?: string;
      temperature: "quente" | "morno" | "frio";
      notes?: string;
      callback_at?: string;
    }) => {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          name: lead.name,
          phone: lead.phone || null,
          email: lead.email || null,
          temperature: lead.temperature,
          status: "pending",
          assigned_to: operatorId,
          notes: lead.notes || null,
          callback_at: lead.callback_at || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: [...LEADS_QUERY_KEY, operatorId] });
      toast.success(`Lead "${data.name}" cadastrado!`);
    },
    onError: (err: Error) => {
      toast.error(`Erro ao cadastrar: ${err.message}`);
    },
  });
}

/** Update a lead's status, temperature, notes, or callback date */
export function useUpdateLead(operatorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Pick<Lead, "status" | "temperature" | "notes" | "callback_at">>;
    }) => {
      const { error } = await supabase
        .from("leads")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("assigned_to", operatorId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...LEADS_QUERY_KEY, operatorId] });
      toast.success("Lead atualizado.");
    },
  });
}

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/supabase-types";
import { toast } from "sonner";

export const LEADS_QUERY_KEY = ["leads"];

export type LeadInput = {
  name: string;
  phone?: string;
  phone2?: string;
  cpf?: string;
  email?: string;
  city?: string;
  state?: string;
  profession?: string;
  company?: string;
  temperature?: "quente" | "morno" | "frio";
  origin?: string;
  notes?: string;
  callback_at?: string;
};

/** Fetch all leads assigned to this operator */
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

/** Register a single new lead */
export function useCreateLead(operatorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: LeadInput) => {
      const { data, error } = await supabase
        .from("leads")
        .insert({
          name: lead.name,
          phone: lead.phone || null,
          phone2: lead.phone2 || null,
          cpf: lead.cpf || null,
          email: lead.email || null,
          city: lead.city || null,
          state: lead.state || null,
          profession: lead.profession || null,
          company: lead.company || null,
          temperature: lead.temperature ?? "morno",
          origin: lead.origin ?? "manual",
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

/** Bulk import leads from CSV */
export function useImportLeads(operatorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (leads: LeadInput[]) => {
      const rows = leads.map((l) => ({
        name: l.name,
        phone: l.phone || null,
        phone2: l.phone2 || null,
        cpf: l.cpf || null,
        email: l.email || null,
        city: l.city || null,
        state: l.state || null,
        profession: l.profession || null,
        company: l.company || null,
        temperature: (l.temperature ?? "frio") as "quente" | "morno" | "frio",
        origin: l.origin ?? "csv",
        status: "pending" as const,
        assigned_to: operatorId,
        notes: l.notes || null,
        callback_at: l.callback_at || null,
      }));

      // Insert in batches of 100 to avoid payload limits
      const BATCH = 100;
      let totalInserted = 0;
      const errors: string[] = [];
      for (let i = 0; i < rows.length; i += BATCH) {
        const batch = rows.slice(i, i + BATCH);
        const { data, error } = await supabase.from("leads").insert(batch).select("id");
        if (error) {
          errors.push(`Linhas ${i + 1}–${i + batch.length}: ${error.message}`);
        } else {
          totalInserted += data?.length ?? 0;
        }
      }
      return { totalInserted, errors };
    },
    onSuccess: ({ totalInserted, errors }) => {
      qc.invalidateQueries({ queryKey: [...LEADS_QUERY_KEY, operatorId] });
      if (errors.length === 0) {
        toast.success(`${totalInserted} leads importados com sucesso!`);
      } else {
        toast.warning(`${totalInserted} importados, ${errors.length} erros.`);
      }
    },
    onError: (err: Error) => {
      toast.error(`Erro na importação: ${err.message}`);
    },
  });
}

/** Update a lead's fields */
export function useUpdateLead(operatorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Lead>;
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
    },
  });
}

/** Delete a lead */
export function useDeleteLead(operatorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("leads")
        .delete()
        .eq("id", id)
        .eq("assigned_to", operatorId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [...LEADS_QUERY_KEY, operatorId] });
      toast.success("Lead removido.");
    },
  });
}

import { useEffect } from "react";
import { importedLeadStatus } from "@/lib/lead-categories";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Lead } from "@/lib/supabase-types";
import { toast } from "sonner";

export const LEADS_QUERY_KEY = ["leads"];

export type LeadInput = {
  name: string;
  is_new?: boolean;
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
  // New Sprint 3 fields
  midia?: string;
  campanha?: string;
  curso?: string;
  data_nascimento?: string;
  genero?: string;
  cep?: string;
};

/** Fetch all leads assigned to this operator */
export function useLeads(operatorId: string, enabled = true) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!operatorId || !enabled) return;
    const channel = supabase.channel(`leads-${operatorId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "leads", filter: `assigned_to=eq.${operatorId}` }, () => {
        void qc.invalidateQueries({ queryKey: [...LEADS_QUERY_KEY, operatorId] });
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [operatorId, qc, enabled]);
  return useQuery({
    queryKey: [...LEADS_QUERY_KEY, operatorId],
    queryFn: async (): Promise<Lead[]> => {
      const all: Lead[] = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const { data, error } = await supabase.from("leads").select("*")
          .eq("assigned_to", operatorId).order("created_at", { ascending: false }).order("id")
          .range(offset, offset + pageSize - 1);
        if (error) throw error;
        all.push(...(data ?? []));
        if (!data || data.length < pageSize) break;
      }
      return all;
    },
    enabled: !!operatorId && enabled,
    refetchInterval: 15000,
  });
}

/** Register a single new lead */
export function useCreateLead(operatorId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lead: LeadInput) => {
      if (!operatorId) throw new Error("Consultor responsável não identificado. Entre novamente.");
      const now = new Date().toISOString();
      const phoneClean = lead.phone ? lead.phone.trim() : null;

      // Check if lead already exists by phone for re-registration
      if (phoneClean) {
        const { data: existing, error: lookupError } = await supabase
          .from("leads")
          .select("*")
          .eq("phone", phoneClean)
          .eq("assigned_to", operatorId)
          .maybeSingle();
        if (lookupError) throw lookupError;

        if (existing) {
          const currentHistory = (existing.historico as Array<{ ts: string; acao: string; detalhes?: string }>) ?? [];
          const newEntry = {
            ts: now,
            acao: "recadastro",
            detalhes: `Lead recadastrado no sistema via ${lead.origin ?? "manual"}`,
          };

          const { data: updated, error: updateErr } = await supabase
            .from("leads")
            .update({
              status: "novo" as any,
              temperature: lead.temperature ?? existing.temperature,
              callback_at: lead.callback_at || null,
              data_ultimo_cadastro: now,
              historico: [...currentHistory, newEntry],
              assigned_to: operatorId || existing.assigned_to,
              updated_at: now,
            })
            .eq("id", existing.id)
            .select()
            .single();

          if (updateErr) throw updateErr;
          return updated;
        }
      }

      const initialHistory = [{
        ts: now,
        acao: "cadastro",
        detalhes: `Lead cadastrado via ${lead.origin ?? "manual"}`,
      }];

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
          status: "novo" as any,
          assigned_to: operatorId,
          notes: lead.notes || null,
          callback_at: lead.callback_at || null,
          midia: lead.midia || null,
          campanha: lead.campanha || null,
          curso: lead.curso || null,
          data_nascimento: lead.data_nascimento || null,
          genero: lead.genero || null,
          cep: lead.cep || null,
          historico: initialHistory,
          data_primeiro_cadastro: now,
          data_ultimo_cadastro: now,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success(`Lead "${data.name}" registrado como Novo Lead!`);
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
      const now = new Date().toISOString();
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
        origin: "csv",
        status: importedLeadStatus(l.is_new),
        assigned_to: operatorId,
        notes: l.notes || null,
        callback_at: l.callback_at || null,
        midia: l.midia || null,
        campanha: l.campanha || null,
        curso: l.curso || null,
        data_nascimento: l.data_nascimento || null,
        genero: l.genero || null,
        cep: l.cep || null,
        historico: [{ ts: now, acao: "importacao_csv", detalhes: l.is_new ? "Importado via CSV como novo lead" : "Importado via CSV para carteira" }],
        data_primeiro_cadastro: now,
        data_ultimo_cadastro: now,
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
      qc.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
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
      // First fetch existing historico
      const { data: existing } = await supabase
        .from("leads")
        .select("historico")
        .eq("id", id)
        .single();
      
      const currentHistory = (existing?.historico as Array<{ts: string; acao: string; detalhes?: string}>) ?? [];
      const newEntry = {
        ts: new Date().toISOString(),
        acao: "atualizacao",
        detalhes: Object.keys(updates).filter(k => k !== 'updated_at' && k !== 'historico').join(', ')
      };
      
      const { id: _, created_at: __, data_primeiro_cadastro: ___, data_ultimo_cadastro: ____, ...cleanUpdates } = updates as any;
      const { error } = await supabase
        .from("leads")
        .update({
          ...cleanUpdates,
          historico: [...currentHistory, newEntry],
          data_ultimo_contato: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("assigned_to", operatorId)
        .select("id")
        .single();
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
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
        .eq("assigned_to", operatorId)
        .select("id")
        .single();
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LEADS_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
      toast.success("Lead removido.");
    },
  });
}


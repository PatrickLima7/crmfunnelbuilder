import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileUp, Users, CheckCircle2, Layers, Search, Trash2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { Lead, Profile } from "@/lib/supabase-types";
import { toast } from "sonner";
import { LeadImportModal } from "@/components/crm/LeadImportModal";

export function LeadsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedOp, setSelectedOp] = useState<string>("all");
  const [openImport, setOpenImport] = useState(false);

  // Fetch all leads
  const { data: leads = [], isLoading: loadingLeads } = useQuery({
    queryKey: ["admin-leads"],
    queryFn: async (): Promise<(Lead & { assigned_profile?: Profile | null })[]> => {
      const { data, error } = await supabase
        .from("leads")
        .select("*, assigned_profile:profiles!leads_assigned_to_fkey(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as (Lead & { assigned_profile?: Profile | null })[]) ?? [];
    },
  });

  // Fetch all operators
  const { data: operators = [] } = useQuery({
    queryKey: ["profiles", "operators"],
    queryFn: async (): Promise<Profile[]> => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "operator")
        .order("name");
      return data ?? [];
    },
  });

  // Active operators count
  const activeOperators = operators.filter((o) => o.active !== false);

  // Filtered leads
  const filteredLeads = leads.filter((l) => {
    const matchOp = selectedOp === "all" || l.assigned_to === selectedOp;
    const matchSearch =
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone ?? "").includes(search) ||
      (l.company ?? "").toLowerCase().includes(search.toLowerCase());
    return matchOp && matchSearch;
  });

  // Bulk delete leads
  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("leads").delete().neq("id", "00000000-0000-0000-0000-000000000000");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Base de leads limpa com sucesso.");
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
    },
  });

  // Re-distribute all pending leads equally among active operators
  const redistributeMutation = useMutation({
    mutationFn: async () => {
      if (activeOperators.length === 0) {
        throw new Error("Nenhum operador ativo para receber leads.");
      }
      const { data: pendingLeads, error } = await supabase
        .from("leads")
        .select("id")
        .eq("status", "pending");
      if (error) throw error;
      if (!pendingLeads || pendingLeads.length === 0) {
        toast.info("Nenhum lead pendente para redistribuir.");
        return 0;
      }

      let updatedCount = 0;
      for (let i = 0; i < pendingLeads.length; i++) {
        const assignedTo = activeOperators[i % activeOperators.length]!.id;
        const { error: err } = await supabase
          .from("leads")
          .update({ assigned_to: assignedTo, updated_at: new Date().toISOString() })
          .eq("id", pendingLeads[i]!.id);
        if (!err) updatedCount++;
      }
      return updatedCount;
    },
    onSuccess: (count) => {
      if (count && count > 0) {
        toast.success(`${count} leads redistribuídos igualmente entre ${activeOperators.length} vendedor(es) ativo(s)!`);
        qc.invalidateQueries({ queryKey: ["admin-leads"] });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-panel p-4">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Layers className="size-4 text-primary" /> Central de Leads e Importação
          </h3>
          <p className="text-xs text-muted-foreground">
            Total no banco: <b>{leads.length}</b> leads · <b>{activeOperators.length}</b> vendedor(es) ativo(s) para receber leads
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setOpenImport(true)} className="gap-1.5">
            <FileUp className="size-4" /> Importar nova base (CSV)
          </Button>
          <Button
            variant="outline"
            onClick={() => redistributeMutation.mutate()}
            disabled={redistributeMutation.isPending || activeOperators.length === 0}
            className="gap-1.5 text-xs"
            title="Redistribuir leads pendentes de forma equilibrada"
          >
            <RefreshCw className={`size-3.5 ${redistributeMutation.isPending ? "animate-spin" : ""}`} />
            Redistribuir pendentes
          </Button>
        </div>
      </div>

      {/* Distribution summary per active operator */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {operators.map((op) => {
          const opLeads = leads.filter((l) => l.assigned_to === op.id);
          const converted = opLeads.filter((l) => l.status === "converted").length;
          const isActive = op.active !== false;
          return (
            <div
              key={op.id}
              onClick={() => setSelectedOp(selectedOp === op.id ? "all" : op.id)}
              className={`cursor-pointer rounded-xl border p-3 text-xs transition-all ${
                selectedOp === op.id
                  ? "border-primary bg-primary/10 ring-1 ring-primary"
                  : "border-border bg-panel hover:border-border/80"
              }`}
            >
              <div className="flex items-center justify-between font-semibold">
                <span className="truncate">{op.name}</span>
                <Badge variant={isActive ? "default" : "secondary"} className="text-[10px]">
                  {isActive ? "Ativo" : "Inativo"}
                </Badge>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-[11px]">
                <span className="text-muted-foreground">Leads carteira:</span>
                <span className="text-right font-bold">{opLeads.length}</span>
                <span className="text-muted-foreground">Convertidos:</span>
                <span className="text-right font-bold text-success">{converted}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filters and Lead list */}
      <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, telefone ou empresa…"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <Select value={selectedOp} onValueChange={setSelectedOp}>
              <SelectTrigger className="h-8 w-44 text-xs">
                <SelectValue placeholder="Filtrar por vendedor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os vendedores</SelectItem>
                {operators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <p className="text-xs text-muted-foreground">
            Exibindo <b>{filteredLeads.length}</b> de <b>{leads.length}</b>
          </p>
        </div>

        {/* Lead Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 uppercase text-[10px] text-muted-foreground font-bold">
              <tr>
                <th className="px-3 py-2">Nome / Empresa</th>
                <th className="px-3 py-2">Telefone</th>
                <th className="px-3 py-2">Origem</th>
                <th className="px-3 py-2">Temperatura</th>
                <th className="px-3 py-2">Vendedor responsável</th>
                <th className="px-3 py-2 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingLeads && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Carregando leads…
                  </td>
                </tr>
              )}
              {!loadingLeads && filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-muted-foreground">
                    Nenhum lead encontrado.
                  </td>
                </tr>
              )}
              {filteredLeads.map((l) => (
                <tr key={l.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5">
                    <p className="font-semibold">{l.name}</p>
                    {l.company && <p className="text-[10px] text-muted-foreground">{l.company}</p>}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px]">{l.phone ?? "—"}</td>
                  <td className="px-3 py-2.5">{l.origin ?? "csv"}</td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      l.temperature === "quente" ? "bg-hot/15 text-hot" :
                      l.temperature === "morno" ? "bg-warm/15 text-warm" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {l.temperature}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="font-medium text-foreground">
                      {l.assigned_profile?.name ?? "Não atribuído"}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold">
                    <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                      l.status === "converted" ? "bg-success/15 text-success" :
                      l.status === "contacted" ? "bg-info/15 text-info" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin CSV Import Modal */}
      <LeadImportModal
        open={openImport}
        onClose={() => {
          setOpenImport(false);
          qc.invalidateQueries({ queryKey: ["admin-leads"] });
        }}
        autoDistribute={true}
      />
    </div>
  );
}

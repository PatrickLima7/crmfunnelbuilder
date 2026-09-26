import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  FileUp,
  FileDown,
  Plus,
  Layers,
  Search,
  Trash2,
  RefreshCw,
  Eye,
  Edit,
  UserCheck,
  Filter,
  Calendar,
  Clock,
  CheckSquare,
  Square,
  X,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/lib/supabase";
import type { Lead, Profile } from "@/lib/supabase-types";
import { toast } from "sonner";
import { LeadImportModal } from "@/components/crm/LeadImportModal";

export function LeadsTab() {
  const qc = useQueryClient();

  // Basic Filter state
  const [search, setSearch] = useState("");
  const [selectedOp, setSelectedOp] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  // Advanced Combinable Filter state
  const [useDateCadastroFilter, setUseDateCadastroFilter] = useState(false);
  const [dateCadastroStart, setDateCadastroStart] = useState("");
  const [dateCadastroEnd, setDateCadastroEnd] = useState("");

  const [useDateRetornoFilter, setUseDateRetornoFilter] = useState(false);
  const [dateRetornoStart, setDateRetornoStart] = useState("");
  const [dateRetornoEnd, setDateRetornoEnd] = useState("");

  const [selectedCurso, setSelectedCurso] = useState("all");
  const [selectedMidia, setSelectedMidia] = useState("all");
  const [onlyUnassignedOrInactiveOp, setOnlyUnassignedOrInactiveOp] = useState(false);

  // Selection & Batch Action state
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [doNotOverwriteAssigned, setDoNotOverwriteAssigned] = useState(false);

  // Inputs for Batch Operations
  const [batchCallbackDate, setBatchCallbackDate] = useState("");
  const [batchTargetOp, setBatchTargetOp] = useState("");

  // CRUD Modals
  const [openImport, setOpenImport] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [viewLead, setViewLead] = useState<any | null>(null);
  const [editLead, setEditLead] = useState<any | null>(null);

  // Lead Form State
  const [form, setForm] = useState({
    name: "",
    phone: "",
    phone2: "",
    telefone_3: "",
    telefone_4: "",
    email: "",
    curso: "",
    midia: "",
    campanha: "",
    hr_para_contato: "",
    observacao: "",
    informacao: "",
    assigned_to: "",
  });

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

  const activeOperators = operators.filter((o: any) => o.active !== false);

  // Extract unique available values for filters
  const availableCursos = Array.from(new Set(leads.map((l: any) => l.curso).filter(Boolean))).sort();
  const availableMidias = Array.from(new Set(leads.map((l: any) => l.midia || l.origin).filter(Boolean))).sort();

  // Filtered leads computation (Combinable AND logic)
  const filteredLeads = leads.filter((l: any) => {
    // 1. Text Search
    if (search) {
      const s = search.toLowerCase();
      const matchSearch =
        (l.name ?? "").toLowerCase().includes(s) ||
        (l.phone ?? "").includes(s) ||
        (l.email ?? "").toLowerCase().includes(s) ||
        (l.curso ?? "").toLowerCase().includes(s) ||
        (l.midia ?? l.origin ?? "").toLowerCase().includes(s);
      if (!matchSearch) return false;
    }

    // 2. Operator Filter
    if (selectedOp !== "all") {
      if (selectedOp === "unassigned") {
        if (l.assigned_to) return false;
      } else {
        if (l.assigned_to !== selectedOp) return false;
      }
    }

    // 3. Somente contatos sem consultor ou consultor inativo
    if (onlyUnassignedOrInactiveOp) {
      const isAssignedActive = activeOperators.some((o) => o.id === l.assigned_to);
      if (isAssignedActive) return false;
    }

    // 4. Status Filter
    if (selectedStatus !== "all") {
      if (selectedStatus === "novo") {
        if (l.status !== "novo" && l.status !== "pending") return false;
      } else {
        if (l.status !== selectedStatus) return false;
      }
    }

    // 5. Curso Filter
    if (selectedCurso !== "all") {
      if ((l.curso ?? "") !== selectedCurso) return false;
    }

    // 6. Midia Filter
    if (selectedMidia !== "all") {
      if ((l.midia ?? l.origin ?? "") !== selectedMidia) return false;
    }

    // 7. Date Cadastro Filter
    if (useDateCadastroFilter) {
      const dateVal = l.data_primeiro_cadastro || l.created_at;
      if (!dateVal) return false;
      const day = new Date(dateVal).toISOString().slice(0, 10);
      if (dateCadastroStart && day < dateCadastroStart) return false;
      if (dateCadastroEnd && day > dateCadastroEnd) return false;
    }

    // 8. Date Retorno Filter
    if (useDateRetornoFilter) {
      if (!l.callback_at) return false;
      const day = new Date(l.callback_at).toISOString().slice(0, 10);
      if (dateRetornoStart && day < dateRetornoStart) return false;
      if (dateRetornoEnd && day > dateRetornoEnd) return false;
    }

    return true;
  });

  // Selection state helpers
  const isAllSelected = filteredLeads.length > 0 && filteredLeads.every((l) => selectedLeadIds.includes(l.id));
  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(filteredLeads.map((l) => l.id));
    }
  };
  const toggleSelectOne = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleClearFilters = () => {
    setSearch("");
    setSelectedOp("all");
    setSelectedStatus("all");
    setSelectedCurso("all");
    setSelectedMidia("all");
    setUseDateCadastroFilter(false);
    setDateCadastroStart("");
    setDateCadastroEnd("");
    setUseDateRetornoFilter(false);
    setDateRetornoStart("");
    setDateRetornoEnd("");
    setOnlyUnassignedOrInactiveOp(false);
    setSelectedLeadIds([]);
  };

  // Export CSV
  const handleExportCsv = () => {
    if (filteredLeads.length === 0) {
      toast.error("Nenhum lead para exportar.");
      return;
    }

    const headers = [
      "Nome",
      "Telefone 1",
      "Telefone 2",
      "Telefone 3",
      "Telefone 4",
      "E-mail",
      "Curso de Interesse",
      "Mídia",
      "Campanha",
      "Hr. Para Contato",
      "Dt. Matrícula",
      "Informação",
      "Observação",
      "Detalhes",
      "Status",
      "Temperatura",
      "Consultor Responsável",
      "Dt. Hr. Prim. Cadastro",
      "Últ. Dt. Cadastro",
      "Dt. Últ. Contato",
      "Dt. Próx. Contato",
    ];

    const rows = filteredLeads.map((l: any) => [
      `"${l.name || ""}"`,
      `"${l.phone || ""}"`,
      `"${l.phone2 || ""}"`,
      `"${l.telefone_3 || ""}"`,
      `"${l.telefone_4 || ""}"`,
      `"${l.email || ""}"`,
      `"${l.curso || ""}"`,
      `"${l.midia || l.origin || ""}"`,
      `"${l.campanha || ""}"`,
      `"${l.hr_para_contato || ""}"`,
      `"${l.dt_matricula || ""}"`,
      `"${(l.informacao || "").replace(/"/g, '""')}"`,
      `"${(l.notes || l.observacao || "").replace(/"/g, '""')}"`,
      `"${(l.detalhes || "").replace(/"/g, '""')}"`,
      `"${l.status || ""}"`,
      `"${l.temperature || ""}"`,
      `"${l.assigned_profile?.name || "Não atribuído"}"`,
      `"${l.data_primeiro_cadastro || l.created_at || ""}"`,
      `"${l.data_ultimo_cadastro || ""}"`,
      `"${l.data_ultimo_contato || ""}"`,
      `"${l.callback_at || ""}"`,
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `leads_export_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`${filteredLeads.length} leads exportados com sucesso!`);
  };

  // Create Lead
  const createMutation = useMutation({
    mutationFn: async () => {
      if (!form.name.trim()) throw new Error("Nome é obrigatório.");
      let assignedTo = form.assigned_to || null;
      if (!assignedTo && activeOperators.length > 0) {
        assignedTo = activeOperators[Math.floor(Math.random() * activeOperators.length)]!.id;
      }
      const now = new Date().toISOString();
      const { error } = await supabase.from("leads").insert({
        name: form.name.trim(),
        phone: form.phone.trim() || null,
        phone2: form.phone2.trim() || null,
        telefone_3: form.telefone_3.trim() || null,
        telefone_4: form.telefone_4.trim() || null,
        email: form.email.trim() || null,
        curso: form.curso.trim() || null,
        midia: form.midia.trim() || null,
        campanha: form.campanha.trim() || null,
        hr_para_contato: form.hr_para_contato.trim() || null,
        notes: form.observacao.trim() || null,
        observacao: form.observacao.trim() || null,
        informacao: form.informacao.trim() || null,
        assigned_to: assignedTo,
        status: "novo" as any,
        temperature: "morno",
        origin: form.midia || "manual",
        data_primeiro_cadastro: now,
        data_ultimo_cadastro: now,
        historico: [{ ts: now, acao: "cadastro_manual", detalhes: `Lead cadastrado via painel administrativo` }] as any,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead cadastrado com sucesso!");
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      setOpenCreate(false);
      setForm({ name: "", phone: "", phone2: "", telefone_3: "", telefone_4: "", email: "", curso: "", midia: "", campanha: "", hr_para_contato: "", observacao: "", informacao: "", assigned_to: "" });
    },
    onError: (err: Error) => toast.error(`Erro ao criar lead: ${err.message}`),
  });

  // Edit Lead
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editLead) return;
      const { id, created_at, data_primeiro_cadastro, ...updates } = editLead;
      const { error } = await supabase
        .from("leads")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead atualizado!");
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
      setEditLead(null);
    },
    onError: (err: Error) => toast.error(`Erro ao atualizar: ${err.message}`),
  });

  // Delete Lead
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead excluído.");
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
    },
    onError: (err: Error) => toast.error(`Erro ao excluir: ${err.message}`),
  });

  // Batch Operation 1: Alterar em massa Data de Retorno
  const batchChangeCallbackMutation = useMutation({
    mutationFn: async () => {
      if (selectedLeadIds.length === 0) throw new Error("Nenhum lead selecionado.");
      if (!batchCallbackDate) throw new Error("Selecione a nova data e horário de retorno.");
      const isoDate = new Date(batchCallbackDate).toISOString();
      const { error } = await supabase
        .from("leads")
        .update({ callback_at: isoDate, updated_at: new Date().toISOString() })
        .in("id", selectedLeadIds);
      if (error) throw error;
      return selectedLeadIds.length;
    },
    onSuccess: (count) => {
      toast.success(`Data de retorno atualizada em ${count} lead(s) com sucesso!`);
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
    },
    onError: (err: Error) => toast.error(`Erro ao alterar data de retorno: ${err.message}`),
  });

  // Batch Operation 2: Atribuir Consultor Escolhido
  const batchAssignConsultantMutation = useMutation({
    mutationFn: async () => {
      if (selectedLeadIds.length === 0) throw new Error("Nenhum lead selecionado.");
      if (!batchTargetOp) throw new Error("Selecione o consultor destino.");

      let targetIds = selectedLeadIds;
      if (doNotOverwriteAssigned) {
        targetIds = selectedLeadIds.filter((id) => {
          const lead = leads.find((l) => l.id === id);
          if (!lead) return false;
          const isAssignedActive = activeOperators.some((o) => o.id === lead.assigned_to);
          return !isAssignedActive; // Keep only unassigned or assigned to inactive operators
        });
      }

      if (targetIds.length === 0) {
        toast.info("Nenhum lead alterado. Todos os leads selecionados já possuem consultor ativo e a opção 'Não sobrepor' está marcada.");
        return 0;
      }

      const { error } = await supabase
        .from("leads")
        .update({ assigned_to: batchTargetOp, updated_at: new Date().toISOString() })
        .in("id", targetIds);

      if (error) throw error;
      return targetIds.length;
    },
    onSuccess: (count) => {
      if (count > 0) {
        toast.success(`${count} lead(s) atribuídos ao consultor com sucesso!`);
        qc.invalidateQueries({ queryKey: ["admin-leads"] });
      }
    },
    onError: (err: Error) => toast.error(`Erro ao atribuir consultor: ${err.message}`),
  });

  // Batch Operation 3: Distribuição Automática e Igualitária entre consultores
  const batchRedistributeMutation = useMutation({
    mutationFn: async () => {
      const targets = selectedLeadIds.length > 0 ? selectedLeadIds : filteredLeads.map((l) => l.id);
      if (targets.length === 0) throw new Error("Nenhum lead selecionado ou filtrado para redistribuir.");
      if (activeOperators.length === 0) throw new Error("Nenhum operador ativo para receber leads.");

      let targetIds = targets;
      if (doNotOverwriteAssigned) {
        targetIds = targets.filter((id) => {
          const lead = leads.find((l) => l.id === id);
          if (!lead) return false;
          const isAssignedActive = activeOperators.some((o) => o.id === lead.assigned_to);
          return !isAssignedActive;
        });
      }

      if (targetIds.length === 0) {
        toast.info("Nenhum lead elegível para redistribuição (opção 'Não sobrepor' impediu a alteração de leads com consultor ativo).");
        return 0;
      }

      let updatedCount = 0;
      for (let i = 0; i < targetIds.length; i++) {
        const assignedTo = activeOperators[i % activeOperators.length]!.id;
        const { error: err } = await supabase
          .from("leads")
          .update({ assigned_to: assignedTo, updated_at: new Date().toISOString() })
          .eq("id", targetIds[i]!);
        if (!err) updatedCount++;
      }
      return updatedCount;
    },
    onSuccess: (count) => {
      if (count && count > 0) {
        toast.success(`${count} lead(s) redistribuídos igualmente entre ${activeOperators.length} consultor(es) ativo(s)!`);
        qc.invalidateQueries({ queryKey: ["admin-leads"] });
      }
    },
    onError: (err: Error) => toast.error(`Erro ao redistribuir: ${err.message}`),
  });

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-panel p-4">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Layers className="size-4 text-primary" /> Central de Gestão & Distribuição Avançada de Leads
          </h3>
          <p className="text-xs text-muted-foreground">
            Total no banco: <b>{leads.length}</b> leads · Exibindo <b>{filteredLeads.length}</b> filtrado(s) · <b>{activeOperators.length}</b> consultor(es) ativo(s)
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setOpenCreate(true)} className="gap-1.5 bg-success text-success-foreground hover:bg-success/90">
            <Plus className="size-4" /> Novo Lead
          </Button>
          <Button onClick={() => setOpenImport(true)} variant="secondary" className="gap-1.5">
            <FileUp className="size-4" /> Importar CSV
          </Button>
          <Button onClick={handleExportCsv} variant="outline" className="gap-1.5">
            <FileDown className="size-4" /> Exportar CSV ({filteredLeads.length})
          </Button>
        </div>
      </div>

      {/* Distribution summary per active operator */}
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {operators.map((op) => {
          const opLeads = leads.filter((l) => l.assigned_to === op.id);
          const converted = opLeads.filter((l) => l.status === "converted").length;
          const isActive = (op as any).active !== false;
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

      {/* ── Painel de Filtros Combináveis Avançados ── */}
      <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
        <div className="flex items-center justify-between border-b border-border pb-2">
          <h4 className="text-xs font-bold uppercase tracking-wide text-primary flex items-center gap-1.5">
            <Filter className="size-3.5" /> Filtros Combináveis do Funil de Vendas
          </h4>
          <Button variant="ghost" size="sm" onClick={handleClearFilters} className="h-6 text-[10px] text-muted-foreground hover:text-foreground">
            <X className="size-3 mr-1" /> Limpar Filtros
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {/* Busca Geral */}
          <div className="space-y-1 col-span-1 sm:col-span-2">
            <Label className="text-[11px] font-bold text-muted-foreground">Busca Textual</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nome, telefone, e-mail, curso ou mídia…"
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>

          {/* Consultor */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-muted-foreground">Nome do Consultor</Label>
            <Select value={selectedOp} onValueChange={setSelectedOp}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos os consultores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os consultores</SelectItem>
                <SelectItem value="unassigned">Sem consultor atribuído</SelectItem>
                {operators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Status */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-muted-foreground">Status do Lead</Label>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos os status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="novo">🆕 Novo Lead</SelectItem>
                <SelectItem value="contacted">Contatado</SelectItem>
                <SelectItem value="converted">🎯 Convertido</SelectItem>
                <SelectItem value="em_nutricao">🌱 Em Nutrição</SelectItem>
                <SelectItem value="blacklisted">🚫 Blacklist (Sem Interesse)</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Curso de Interesse */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-muted-foreground">Curso de Interesse</Label>
            <Select value={selectedCurso} onValueChange={setSelectedCurso}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todos os cursos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cursos</SelectItem>
                {availableCursos.map((c: any) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mídia / Origem */}
          <div className="space-y-1">
            <Label className="text-[11px] font-bold text-muted-foreground">Mídia / Origem</Label>
            <Select value={selectedMidia} onValueChange={setSelectedMidia}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Todas as mídias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as mídias</SelectItem>
                {availableMidias.map((m: any) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Filtro Dt. Cadastro */}
          <div className="space-y-1 col-span-1 sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-2">
            <div className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                id="chkDtCadastro"
                checked={useDateCadastroFilter}
                onChange={(e) => setUseDateCadastroFilter(e.target.checked)}
                className="rounded border-border accent-primary cursor-pointer"
              />
              <label htmlFor="chkDtCadastro" className="text-[11px] font-bold cursor-pointer select-none">
                Filtrar Por Dt. Cadastro
              </label>
            </div>
            {useDateCadastroFilter && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Data Inicial</span>
                  <Input
                    type="date"
                    value={dateCadastroStart}
                    onChange={(e) => setDateCadastroStart(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Data Final</span>
                  <Input
                    type="date"
                    value={dateCadastroEnd}
                    onChange={(e) => setDateCadastroEnd(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Filtro Dt. Retorno */}
          <div className="space-y-1 col-span-1 sm:col-span-2 rounded-lg border border-border/60 bg-muted/20 p-2">
            <div className="flex items-center gap-2 mb-1">
              <input
                type="checkbox"
                id="chkDtRetorno"
                checked={useDateRetornoFilter}
                onChange={(e) => setUseDateRetornoFilter(e.target.checked)}
                className="rounded border-border accent-primary cursor-pointer"
              />
              <label htmlFor="chkDtRetorno" className="text-[11px] font-bold cursor-pointer select-none">
                Filtrar Por Dt. Retorno
              </label>
            </div>
            {useDateRetornoFilter && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-muted-foreground block">Data Inicial</span>
                  <Input
                    type="date"
                    value={dateRetornoStart}
                    onChange={(e) => setDateRetornoStart(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-muted-foreground block">Data Final</span>
                  <Input
                    type="date"
                    value={dateRetornoEnd}
                    onChange={(e) => setDateRetornoEnd(e.target.value)}
                    className="h-7 text-xs"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Checkbox: Somente contatos sem consultor ou consultor inativo */}
        <div className="pt-1 flex items-center gap-2">
          <input
            type="checkbox"
            id="chkUnassignedOnly"
            checked={onlyUnassignedOrInactiveOp}
            onChange={(e) => setOnlyUnassignedOrInactiveOp(e.target.checked)}
            className="rounded border-border accent-primary cursor-pointer"
          />
          <label htmlFor="chkUnassignedOnly" className="text-xs font-semibold text-foreground cursor-pointer select-none">
            Somente mostrar contatos sem consultor ou consultor inativo
          </label>
        </div>
      </div>

      {/* ── Painel de Seleção e Ações em Lote (Batch Operations) ── */}
      <div className="rounded-xl border border-primary/40 bg-primary/5 p-3 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 pb-2">
          <div className="flex items-center gap-2">
            <Badge variant="default" className="bg-primary text-primary-foreground font-mono">
              {selectedLeadIds.length} selecionado(s)
            </Badge>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1"
              onClick={toggleSelectAll}
            >
              {isAllSelected ? <CheckSquare className="size-3.5 text-primary" /> : <Square className="size-3.5" />}
              {isAllSelected ? "Desmarcar Todos os Filtrados" : "Marcar Todos os Filtrados"}
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="chkDoNotOverwrite"
              checked={doNotOverwriteAssigned}
              onChange={(e) => setDoNotOverwriteAssigned(e.target.checked)}
              className="rounded border-border accent-primary cursor-pointer"
            />
            <label htmlFor="chkDoNotOverwrite" className="text-xs font-bold text-foreground cursor-pointer select-none">
              Não Sobrepor consultores já vinculados
            </label>
          </div>
        </div>

        {/* Linha de Ações em Lote */}
        <div className="grid gap-3 md:grid-cols-3">
          {/* Ação 1: Alterar Data de Retorno em Massa */}
          <div className="space-y-1.5 rounded-lg border border-border bg-panel p-2.5">
            <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3 text-primary" /> Nova Data de Retorno
            </Label>
            <Input
              type="datetime-local"
              value={batchCallbackDate}
              onChange={(e) => setBatchCallbackDate(e.target.value)}
              className="h-8 text-xs"
            />
            <Button
              size="sm"
              variant="secondary"
              className="w-full h-7 text-xs gap-1"
              disabled={selectedLeadIds.length === 0 || !batchCallbackDate || batchChangeCallbackMutation.isPending}
              onClick={() => batchChangeCallbackMutation.mutate()}
            >
              <Clock className="size-3" /> Alterar Data de Retorno
            </Button>
          </div>

          {/* Ação 2: Atribuir Consultor Escolhido */}
          <div className="space-y-1.5 rounded-lg border border-border bg-panel p-2.5">
            <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
              <UserCheck className="size-3 text-primary" /> Novo Consultor
            </Label>
            <Select value={batchTargetOp} onValueChange={setBatchTargetOp}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Selecione um consultor" />
              </SelectTrigger>
              <SelectContent>
                {activeOperators.map((op) => (
                  <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="secondary"
              className="w-full h-7 text-xs gap-1"
              disabled={selectedLeadIds.length === 0 || !batchTargetOp || batchAssignConsultantMutation.isPending}
              onClick={() => batchAssignConsultantMutation.mutate()}
            >
              <UserCheck className="size-3" /> Atribuir aos Selecionados
            </Button>
          </div>

          {/* Ação 3: Distribuição Automática e Igualitária */}
          <div className="space-y-1.5 rounded-lg border border-border bg-panel p-2.5 flex flex-col justify-between">
            <div>
              <Label className="text-[11px] font-bold text-muted-foreground flex items-center gap-1">
                <Users className="size-3 text-primary" /> Distribuição Automática
              </Label>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                Divide os leads selecionados (ou filtrados) igualmente entre os {activeOperators.length} consultor(es) ativo(s).
              </p>
            </div>
            <Button
              size="sm"
              variant="default"
              className="w-full h-7 text-xs gap-1 bg-primary text-primary-foreground hover:bg-primary/90 mt-1"
              disabled={batchRedistributeMutation.isPending || activeOperators.length === 0}
              onClick={() => batchRedistributeMutation.mutate()}
            >
              <RefreshCw className={`size-3 ${batchRedistributeMutation.isPending ? "animate-spin" : ""}`} />
              Distribuir Automaticamente
            </Button>
          </div>
        </div>
      </div>

      {/* ── Tabela de Leads ── */}
      <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Resultados do Funil ({filteredLeads.length} leads)
          </h4>
          <span className="text-xs text-muted-foreground font-mono">
            {selectedLeadIds.length} marcado(s) de {filteredLeads.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border bg-muted/40 uppercase text-[10px] text-muted-foreground font-bold">
              <tr>
                <th className="px-3 py-2 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-border accent-primary cursor-pointer"
                    title="Selecionar / Desselecionar todos"
                  />
                </th>
                <th className="px-3 py-2">Nome do Prospecto</th>
                <th className="px-3 py-2">Telefone</th>
                <th className="px-3 py-2">Curso / Mídia</th>
                <th className="px-3 py-2">Dt. Hr. Cadastro</th>
                <th className="px-3 py-2">Dt. Retorno</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Nome do Consultor</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingLeads && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    Carregando leads…
                  </td>
                </tr>
              )}
              {!loadingLeads && filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-muted-foreground">
                    Nenhum lead encontrado com os filtros aplicados.
                  </td>
                </tr>
              )}
              {filteredLeads.map((l: any) => {
                const isSelected = selectedLeadIds.includes(l.id);
                const dtCadastroFormatted = l.data_primeiro_cadastro || l.created_at
                  ? new Date(l.data_primeiro_cadastro || l.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
                  : "—";
                const dtRetornoFormatted = l.callback_at
                  ? new Date(l.callback_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" })
                  : "—";

                return (
                  <tr key={l.id} className={`hover:bg-muted/30 transition-colors ${isSelected ? "bg-primary/5 font-medium" : ""}`}>
                    <td className="px-3 py-2.5 text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(l.id)}
                        className="rounded border-border accent-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-3 py-2.5 font-semibold">
                      {l.name}
                      {l.email && <p className="text-[10px] text-muted-foreground font-normal">{l.email}</p>}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-[11px]">{l.phone ?? "—"}</td>
                    <td className="px-3 py-2 text-[11px]">
                      <div>{l.curso || "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{l.midia || l.origin || "—"}</div>
                    </td>
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{dtCadastroFormatted}</td>
                    <td className="px-3 py-2 font-mono text-[11px]">
                      {l.callback_at ? (
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          l.status === "converted" ? "bg-success/15 text-success" : "bg-warning/15 text-warning-foreground"
                        }`}>
                          <Clock className="size-2.5" /> {dtRetornoFormatted}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-semibold">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] ${
                        l.status === "converted" ? "bg-success/15 text-success" :
                        l.status === "contacted" ? "bg-info/15 text-info" :
                        l.status === "em_nutricao" ? "bg-purple-500/15 text-purple-500" :
                        l.status === "blacklisted" ? "bg-destructive/15 text-destructive font-bold" :
                        "bg-muted text-muted-foreground"
                      }`}>
                        {l.status === "blacklisted" ? "🚫 Blacklist" : l.status === "em_nutricao" ? "Em Nutrição" : l.status}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-[11px]">
                      {l.assigned_profile?.name ?? (
                        <span className="text-warning italic font-normal">Não atribuído</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {l.status === "blacklisted" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[10px] text-success border-success/40 bg-success/10 hover:bg-success/20"
                            title="Reativar lead e voltar para a fila pendente"
                            onClick={async () => {
                              await supabase.from("leads").update({ status: "novo" }).eq("id", l.id);
                              qc.invalidateQueries({ queryKey: ["admin-leads"] });
                              toast.success(`Lead "${l.name}" reativado para status Novo Lead!`);
                            }}
                          >
                            <RefreshCw className="size-3 mr-1" /> Reativar
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          title="Ver detalhes"
                          onClick={() => setViewLead(l)}
                        >
                          <Eye className="size-3.5" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7"
                          title="Editar lead"
                          onClick={() => {
                            setEditLead(l);
                            setForm({
                              name: l.name ?? "",
                              phone: l.phone ?? "",
                              phone2: l.phone2 ?? "",
                              telefone_3: l.telefone_3 ?? "",
                              telefone_4: l.telefone_4 ?? "",
                              email: l.email ?? "",
                              curso: l.curso ?? "",
                              midia: l.midia ?? "",
                              campanha: l.campanha ?? "",
                              hr_para_contato: l.hr_para_contato ?? "",
                              observacao: l.observacao ?? "",
                              informacao: l.informacao ?? "",
                              assigned_to: l.assigned_to ?? "",
                            });
                          }}
                        >
                          <Edit className="size-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="icon" variant="ghost" className="size-7 text-destructive hover:text-destructive">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir lead?</AlertDialogTitle>
                              <AlertDialogDescription>
                                "{l.name}" será excluído permanentemente do banco de dados.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                className="bg-destructive text-destructive-foreground"
                                onClick={() => deleteMutation.mutate(l.id)}
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dialog: Incluir Lead */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Incluir Novo Lead</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-bold">Nome *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Nome completo do lead" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Telefone 1</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(11) 99999-9999" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Telefone 2</Label>
              <Input value={form.phone2} onChange={(e) => setForm({ ...form, phone2: e.target.value })} placeholder="(11) 98888-8888" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Telefone 3</Label>
              <Input value={form.telefone_3} onChange={(e) => setForm({ ...form, telefone_3: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Telefone 4</Label>
              <Input value={form.telefone_4} onChange={(e) => setForm({ ...form, telefone_4: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">E-mail</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Curso de Interesse</Label>
              <Input value={form.curso} onChange={(e) => setForm({ ...form, curso: e.target.value })} placeholder="Nome do curso" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Mídia</Label>
              <Input value={form.midia} onChange={(e) => setForm({ ...form, midia: e.target.value })} placeholder="Ex: Instagram, Google" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Campanha</Label>
              <Input value={form.campanha} onChange={(e) => setForm({ ...form, campanha: e.target.value })} placeholder="Nome da campanha" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Horário para Contato</Label>
              <Input value={form.hr_para_contato} onChange={(e) => setForm({ ...form, hr_para_contato: e.target.value })} placeholder="Ex: 14:00 às 18:00" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs font-bold">Vendedor Atribuído</Label>
              <Select value={form.assigned_to} onValueChange={(val) => setForm({ ...form, assigned_to: val })}>
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Automático (Round-Robin)" />
                </SelectTrigger>
                <SelectContent>
                  {activeOperators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-bold">Observação</Label>
              <Input value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} placeholder="Observações do cadastro" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCreate(false)}>Cancelar</Button>
            <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !form.name.trim()}>
              Salvar Lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Consultar Lead */}
      <Dialog open={!!viewLead} onOpenChange={(o) => { if (!o) setViewLead(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[650px]">
          <DialogHeader>
            <DialogTitle>Consulta de Lead</DialogTitle>
          </DialogHeader>
          {viewLead && (
            <div className="space-y-4 py-2 text-xs">
              <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-3">
                <div><span className="font-bold">Nome:</span> {viewLead.name}</div>
                <div><span className="font-bold">Status:</span> {viewLead.status}</div>
                <div><span className="font-bold">Telefone 1:</span> {viewLead.phone || "—"}</div>
                <div><span className="font-bold">Telefone 2:</span> {viewLead.phone2 || "—"}</div>
                <div><span className="font-bold">Telefone 3:</span> {viewLead.telefone_3 || "—"}</div>
                <div><span className="font-bold">Telefone 4:</span> {viewLead.telefone_4 || "—"}</div>
                <div><span className="font-bold">E-mail:</span> {viewLead.email || "—"}</div>
                <div><span className="font-bold">Curso de Interesse:</span> {viewLead.curso || "—"}</div>
                <div><span className="font-bold">Mídia:</span> {viewLead.midia || viewLead.origin || "—"}</div>
                <div><span className="font-bold">Campanha:</span> {viewLead.campanha || "—"}</div>
                <div><span className="font-bold">Horário para Contato:</span> {viewLead.hr_para_contato || "—"}</div>
                <div><span className="font-bold">Dt. Matrícula:</span> {viewLead.dt_matricula || "—"}</div>
                <div><span className="font-bold">Consultor:</span> {viewLead.assigned_profile?.name || "Não atribuído"}</div>
                <div><span className="font-bold">Temperatura:</span> {viewLead.temperature}</div>
                <div><span className="font-bold">Dt. 1º Cadastro:</span> {viewLead.data_primeiro_cadastro || viewLead.created_at ? new Date(viewLead.data_primeiro_cadastro || viewLead.created_at).toLocaleString("pt-BR") : "—"}</div>
                <div><span className="font-bold">Último Contato:</span> {viewLead.data_ultimo_contato ? new Date(viewLead.data_ultimo_contato).toLocaleString("pt-BR") : "—"}</div>
              </div>

              {viewLead.notes || viewLead.observacao ? (
                <div className="rounded-lg border p-3">
                  <p className="font-bold mb-1">Observação:</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{viewLead.notes || viewLead.observacao}</p>
                </div>
              ) : null}

              {viewLead.historico && Array.isArray(viewLead.historico) && viewLead.historico.length > 0 && (
                <div className="rounded-lg border p-3">
                  <p className="font-bold mb-2">Histórico de Interações ({viewLead.historico.length})</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {viewLead.historico.map((h: any, idx: number) => (
                      <div key={idx} className="border-b border-border/50 pb-1 text-[11px]">
                        <span className="font-mono text-muted-foreground">{new Date(h.ts).toLocaleString("pt-BR")}: </span>
                        <span className="font-semibold text-primary">{h.acao} </span>
                        <span>{h.detalhes}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="secondary" onClick={() => setViewLead(null)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Alterar Lead */}
      <Dialog open={!!editLead} onOpenChange={(o) => { if (!o) setEditLead(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Alterar Lead</DialogTitle>
          </DialogHeader>
          {editLead && (
            <div className="grid grid-cols-2 gap-3 py-2 text-xs">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-bold">Nome</Label>
                <Input value={editLead.name || ""} onChange={(e) => setEditLead({ ...editLead, name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Telefone 1</Label>
                <Input value={editLead.phone || ""} onChange={(e) => setEditLead({ ...editLead, phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Telefone 2</Label>
                <Input value={editLead.phone2 || ""} onChange={(e) => setEditLead({ ...editLead, phone2: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Telefone 3</Label>
                <Input value={editLead.telefone_3 || ""} onChange={(e) => setEditLead({ ...editLead, telefone_3: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Telefone 4</Label>
                <Input value={editLead.telefone_4 || ""} onChange={(e) => setEditLead({ ...editLead, telefone_4: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">E-mail</Label>
                <Input value={editLead.email || ""} onChange={(e) => setEditLead({ ...editLead, email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Curso de Interesse</Label>
                <Input value={editLead.curso || ""} onChange={(e) => setEditLead({ ...editLead, curso: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Mídia</Label>
                <Input value={editLead.midia || ""} onChange={(e) => setEditLead({ ...editLead, midia: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Campanha</Label>
                <Input value={editLead.campanha || ""} onChange={(e) => setEditLead({ ...editLead, campanha: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Status</Label>
                <Select value={editLead.status || "novo"} onValueChange={(val) => setEditLead({ ...editLead, status: val })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="novo">Novo Lead</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="contacted">Contatado</SelectItem>
                    <SelectItem value="converted">Convertido</SelectItem>
                    <SelectItem value="inactive">Inativo</SelectItem>
                    <SelectItem value="em_nutricao">Em Nutrição</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-bold">Temperatura</Label>
                <Select value={editLead.temperature || "morno"} onValueChange={(val) => setEditLead({ ...editLead, temperature: val })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quente">Quente</SelectItem>
                    <SelectItem value="morno">Morno</SelectItem>
                    <SelectItem value="frio">Frio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-bold">Consultor Atribuído</Label>
                <Select value={editLead.assigned_to || ""} onValueChange={(val) => setEditLead({ ...editLead, assigned_to: val })}>
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione um consultor" /></SelectTrigger>
                  <SelectContent>
                    {activeOperators.map((op) => (
                      <SelectItem key={op.id} value={op.id}>{op.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-bold">Observação</Label>
                <Input value={editLead.notes || editLead.observacao || ""} onChange={(e) => setEditLead({ ...editLead, notes: e.target.value, observacao: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditLead(null)}>Cancelar</Button>
            <Button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileUp, FileDown, Plus, Layers, Search, Trash2, RefreshCw, Eye, Edit, UserCheck } from "lucide-react";
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
  const [search, setSearch] = useState("");
  const [selectedOp, setSelectedOp] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [openImport, setOpenImport] = useState(false);

  // CRUD Modals
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

  // Filtered leads
  const filteredLeads = leads.filter((l: any) => {
    const matchOp = selectedOp === "all" || l.assigned_to === selectedOp;
    const matchSearch =
      !search ||
      l.name.toLowerCase().includes(search.toLowerCase()) ||
      (l.phone ?? "").includes(search) ||
      (l.email ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (l.curso ?? "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = selectedStatus === "all" || l.status === selectedStatus;
    return matchOp && matchSearch && matchStatus;
  });

  // Export CSV
  const handleExportCsv = () => {
    if (leads.length === 0) {
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
        status: "pending",
        temperature: "morno",
        origin: form.midia || "manual",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Lead cadastrado com sucesso!");
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
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

  // Redistribute pending
  const redistributeMutation = useMutation({
    mutationFn: async () => {
      if (activeOperators.length === 0) throw new Error("Nenhum operador ativo para receber leads.");
      const { data: pendingLeads, error } = await supabase.from("leads").select("id").eq("status", "pending");
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
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-4">
      {/* Header controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-panel p-4">
        <div>
          <h3 className="text-base font-bold flex items-center gap-2">
            <Layers className="size-4 text-primary" /> Central de Leads (CRUD Completo)
          </h3>
          <p className="text-xs text-muted-foreground">
            Total no banco: <b>{leads.length}</b> leads · <b>{activeOperators.length}</b> vendedor(es) ativo(s)
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
            <FileDown className="size-4" /> Exportar CSV
          </Button>
          <Button
            variant="ghost"
            onClick={() => redistributeMutation.mutate()}
            disabled={redistributeMutation.isPending || activeOperators.length === 0}
            className="gap-1.5 text-xs"
            title="Redistribuir leads pendentes de forma equilibrada"
          >
            <RefreshCw className={`size-3.5 ${redistributeMutation.isPending ? "animate-spin" : ""}`} />
            Redistribuir
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

      {/* Filters and Lead list */}
      <div className="rounded-xl border border-border bg-panel p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, telefone, e-mail ou curso…"
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
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="contacted">Contatado</SelectItem>
                <SelectItem value="converted">Convertido</SelectItem>
                <SelectItem value="inactive">Inativo</SelectItem>
                <SelectItem value="em_nutricao">Em Nutrição</SelectItem>
                <SelectItem value="blacklisted">🚫 Blacklist (Sem Interesse)</SelectItem>
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
                <th className="px-3 py-2">Nome</th>
                <th className="px-3 py-2">Telefone 1</th>
                <th className="px-3 py-2">Curso</th>
                <th className="px-3 py-2">Mídia</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Consultor</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loadingLeads && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    Carregando leads…
                  </td>
                </tr>
              )}
              {!loadingLeads && filteredLeads.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground">
                    Nenhum lead encontrado.
                  </td>
                </tr>
              )}
              {filteredLeads.map((l: any) => (
                <tr key={l.id} className="hover:bg-muted/30">
                  <td className="px-3 py-2.5 font-semibold">
                    {l.name}
                    {l.email && <p className="text-[10px] text-muted-foreground font-normal">{l.email}</p>}
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[11px]">{l.phone ?? "—"}</td>
                  <td className="px-3 py-2 text-[11px]">{l.curso ?? "—"}</td>
                  <td className="px-3 py-2 text-[11px]">{l.midia ?? l.origin ?? "—"}</td>
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
                    {l.assigned_profile?.name ?? "Não atribuído"}
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
                            await supabase.from("leads").update({ status: "pending" }).eq("id", l.id);
                            qc.invalidateQueries({ queryKey: ["admin-leads"] });
                            toast.success(`Lead "${l.name}" reativado para status Pendente!`);
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
              ))}
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
                  {operators.map((op) => (
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
                <Select value={editLead.status || "pending"} onValueChange={(val) => setEditLead({ ...editLead, status: val })}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
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
                  <SelectTrigger className="h-9"><SelectValue placeholder="Selecione um vendedor" /></SelectTrigger>
                  <SelectContent>
                    {operators.map((op) => (
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

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Shield, Target, User, UserCheck, UserX, Check, Power, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { supabase } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase-types";
import { toast } from "sonner";

function useVendedores() {
  return useQuery({
    queryKey: ["profiles", "operators"],
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });
}

function useCreateOperator() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ email, name, goal }: { email: string; name: string; goal: number }) => {
      const { data, error } = await supabase.functions.invoke("create-operator", {
        body: { email, name, goal },
      });
      if (error) throw new Error("Não foi possível criar o consultor. Verifique a função create-operator no Supabase.");
      if (!data?.tempPassword) throw new Error(data?.error ?? "Resposta inválida do servidor.");
      return data as { tempPassword: string };

    },
    onSuccess: ({ tempPassword }) => {
      toast.success(`Consultor criado com sucesso! Senha temporária: ${tempPassword}`);
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao criar consultor: ${err.message}`);
    },
  });
}

function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
      const { id: _, created_at: __, ...cleanUpdates } = updates as any;
      const { error } = await supabase
        .from("profiles")
        .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Consultor atualizado.");
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao atualizar: ${err.message}`);
    },
  });
}

function useLeadCounts() {
  return useQuery({
    queryKey: ["leads", "counts"],
    queryFn: async () => {
      const { data, error } = await supabase.from("leads").select("assigned_to");
      if (error) throw error;
      const counts: Record<string, number> = {};
      for (const lead of data || []) {
        if (lead.assigned_to) {
          counts[lead.assigned_to] = (counts[lead.assigned_to] || 0) + 1;
        }
      }
      return counts;
    },
  });
}

function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (profileId: string) => {
      // Unassign leads previously assigned to this profile (assigned_to = null)
      const { error: leadsErr } = await supabase
        .from("leads")
        .update({ assigned_to: null, updated_at: new Date().toISOString() })
        .eq("assigned_to", profileId);
        
      if (leadsErr) throw leadsErr;

      // Clean presence record if exists
      await supabase.from("operator_presence").delete().eq("operator_id", profileId);

      const { error } = await supabase.from("profiles").delete().eq("id", profileId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Consultor excluído. Os leads que pertenciam a ele agora estão sem consultor.");
      qc.invalidateQueries({ queryKey: ["profiles"] });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["admin-leads"] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao excluir consultor: ${err.message}`);
    },
  });
}

export function VendedoresTab() {
  const { data: profiles = [], isLoading } = useVendedores();
  const createOp = useCreateOperator();
  const updateProfile = useUpdateProfile();
  const deleteProfile = useDeleteProfile();
  const { data: leadCounts = {} } = useLeadCounts();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newGoal, setNewGoal] = useState<number>(80);
  const [searchTerm, setSearchTerm] = useState("");

  const admins = profiles.filter((p) => p.role === "admin");
  const operators = profiles.filter((p) => p.role === "operator");
  const filteredOperators = operators.filter(op => op.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createOp.mutateAsync({ email: newEmail, name: newName, goal: newGoal });
    setNewEmail("");
    setNewName("");
    setNewGoal(80);
    setOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold">Gestão de Consultores e Metas Individuais</h3>
          <p className="text-xs text-muted-foreground">
            {operators.length} consultores ({operators.filter((o) => o.active !== false).length} ativos) · {admins.length} admin(s)
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus /> Novo consultor
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar novo consultor</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label>Nome completo</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="João Silva"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>E-mail corporativo</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="joao@empresa.com"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Meta diária de contatos (individual)</Label>
                <Input
                  type="number"
                  min={1}
                  value={newGoal}
                  onChange={(e) => setNewGoal(Number(e.target.value) || 80)}
                />
              </div>
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Uma senha temporária será gerada e exibida após a criação.
              </p>
              <div className="flex gap-2">
                <Button type="submit" disabled={createOp.isPending} className="flex-1">
                  {createOp.isPending ? "Criando..." : "Criar consultor"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Operators list */}
      <div className="rounded-xl border border-border bg-panel">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-border px-4 py-2.5 gap-2">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Consultores / Operadores
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar consultor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>
        </div>
        <div className="divide-y divide-border">
          {filteredOperators.length === 0 && (
            <p className="px-4 py-4 text-sm text-muted-foreground">Nenhum consultor encontrado.</p>
          )}
          {filteredOperators.map((op) => (
            <ProfileRow
              key={op.id}
              profile={op}
              leadCount={leadCounts[op.id] || 0}
              onUpdateGoal={(goal) => updateProfile.mutate({ id: op.id, updates: { daily_contacts_goal: goal } as any })}
              onToggleActive={(active) => updateProfile.mutate({ id: op.id, updates: { active } as any })}
              onMakeAdmin={() => updateProfile.mutate({ id: op.id, updates: { role: "admin" } })}
              onDelete={() => deleteProfile.mutate(op.id)}
              isDeleting={deleteProfile.isPending && deleteProfile.variables === op.id}
            />
          ))}
        </div>
      </div>

      {/* Admins list */}
      <div className="rounded-xl border border-border bg-panel">
        <div className="border-b border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Administradores
        </div>
        <div className="divide-y divide-border">
          {admins.map((ad) => (
            <ProfileRow
              key={ad.id}
              profile={ad}
              onMakeOperator={() => updateProfile.mutate({ id: ad.id, updates: { role: "operator" } })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileRow({
  profile,
  leadCount,
  onUpdateGoal,
  onToggleActive,
  onMakeAdmin,
  onMakeOperator,
  onDelete,
  isDeleting,
}: {
  profile: Profile;
  leadCount?: number;
  onUpdateGoal?: (goal: number) => void;
  onToggleActive?: (active: boolean) => void;
  onMakeAdmin?: () => void;
  onMakeOperator?: () => void;
  onDelete?: () => void;
  isDeleting?: boolean;
}) {
  const [goal, setGoal] = useState<number>((profile as any).daily_contacts_goal ?? 80);
  const [editing, setEditing] = useState(false);

  const initials = profile.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const handleGoalSave = () => {
    if (onUpdateGoal) onUpdateGoal(goal);
    setEditing(false);
  };

  const isActive = (profile as any).active !== false;

  return (
    <div className={`flex flex-wrap items-center gap-3 px-4 py-3 ${!isActive ? "opacity-60 bg-muted/20" : ""}`}>
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {initials}
      </span>
      <div className="min-w-[160px] flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{profile.name}</p>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
            isActive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
          }`}>
            {isActive ? "Ativo" : "Inativo"}
          </span>
        </div>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {profile.role === "admin" ? (
            <><Shield className="size-3 text-primary" /> Admin</>
          ) : (
            <><User className="size-3" /> Consultor</>
          )}
          · criado em {new Date(profile.created_at).toLocaleDateString("pt-BR")}
          {leadCount !== undefined && ` · ${leadCount} lead(s)`}
        </p>
      </div>

      {/* Goal editor for operators */}
      {profile.role === "operator" && (
        <div className="flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-2.5 py-1">
          <Target className="size-3.5 text-primary" />
          <span className="text-xs text-muted-foreground">Meta:</span>
          {editing ? (
            <div className="flex items-center gap-1">
              <Input
                type="number"
                min={1}
                value={goal}
                onChange={(e) => setGoal(Number(e.target.value) || 1)}
                className="h-6 w-16 px-1 text-xs font-bold"
              />
              <Button size="icon" className="size-6" onClick={handleGoalSave}>
                <Check className="size-3" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setEditing(true)}
              className="font-mono text-xs font-bold text-foreground hover:underline"
              title="Clique para editar a meta individual"
            >
              {(profile as any).daily_contacts_goal ?? 80} contatos/dia
            </button>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 ml-auto">
        {onToggleActive && (
          <Button
            size="sm"
            variant={isActive ? "outline" : "default"}
            onClick={() => onToggleActive(!isActive)}
            className="h-7 text-xs gap-1"
          >
            <Power className="size-3" /> {isActive ? "Desativar" : "Ativar"}
          </Button>
        )}
        {onMakeAdmin && (
          <Button size="sm" variant="secondary" onClick={onMakeAdmin} className="h-7 text-xs gap-1">
            <UserCheck className="size-3" /> Tornar admin
          </Button>
        )}
        {onMakeOperator && (
          <Button size="sm" variant="secondary" onClick={onMakeOperator} className="h-7 text-xs gap-1">
            <UserX className="size-3" /> Tornar consultor
          </Button>
        )}
        {onDelete && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="size-3" /> Excluir
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir consultor?</AlertDialogTitle>
                <AlertDialogDescription>
                  Tem certeza que deseja excluir "{profile.name}"?
                  {leadCount !== undefined && leadCount > 0 && ` Os ${leadCount} lead(s) atuais deste consultor ficarão sem consultor atribuído.`}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  {isDeleting ? "Excluindo..." : "Excluir"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

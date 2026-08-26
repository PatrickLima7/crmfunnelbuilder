import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Mail, Plus, Shield, Trash2, User, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
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
    mutationFn: async ({ email, name }: { email: string; name: string }) => {
      // Create user via Supabase admin auth (requires service role — done server-side in production)
      // For now: create with a temporary password and metadata
      const tempPassword = `CRM@${Math.random().toString(36).slice(2, 10)}`;
      const { data, error } = await supabase.auth.admin?.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { name, role: "operator" },
      }) ?? { data: null, error: new Error("Admin API unavailable on browser client") };

      if (error) throw error;
      return { data, tempPassword };
    },
    onSuccess: ({ tempPassword }) => {
      toast.success(`Operador criado! Senha temporária: ${tempPassword}`);
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
    onError: (err: Error) => {
      toast.error(`Erro ao criar operador: ${err.message}`);
    },
  });
}

function useUpdateRole() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, role }: { id: string; role: "admin" | "operator" }) => {
      const { error } = await supabase
        .from("profiles")
        .update({ role, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado.");
      qc.invalidateQueries({ queryKey: ["profiles"] });
    },
  });
}

export function VendedoresTab() {
  const { data: profiles = [], isLoading } = useVendedores();
  const createOp = useCreateOperator();
  const updateRole = useUpdateRole();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");

  const admins = profiles.filter((p) => p.role === "admin");
  const operators = profiles.filter((p) => p.role === "operator");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createOp.mutateAsync({ email: newEmail, name: newName });
    setNewEmail("");
    setNewName("");
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
        <p className="text-xs text-muted-foreground">
          {operators.length} operador(es) · {admins.length} admin(s)
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus /> Novo operador
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Criar novo operador</DialogTitle>
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
              <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                Uma senha temporária será gerada e exibida após a criação. Compartilhe com o operador para o primeiro acesso.
              </p>
              <div className="flex gap-2">
                <Button type="submit" disabled={createOp.isPending} className="flex-1">
                  {createOp.isPending ? "Criando..." : "Criar operador"}
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
        <div className="border-b border-border px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Operadores
        </div>
        <div className="divide-y divide-border">
          {operators.length === 0 && (
            <p className="px-4 py-4 text-sm text-muted-foreground">Nenhum operador cadastrado ainda.</p>
          )}
          {operators.map((op) => (
            <ProfileRow
              key={op.id}
              profile={op}
              onMakeAdmin={() => updateRole.mutate({ id: op.id, role: "admin" })}
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
              onMakeOperator={() => updateRole.mutate({ id: ad.id, role: "operator" })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ProfileRow({
  profile,
  onMakeAdmin,
  onMakeOperator,
}: {
  profile: Profile;
  onMakeAdmin?: () => void;
  onMakeOperator?: () => void;
}) {
  const initials = profile.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">
        {initials}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{profile.name}</p>
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          {profile.role === "admin" ? (
            <><Shield className="size-3" /> Admin</>
          ) : (
            <><User className="size-3" /> Operador</>
          )}
          · desde {new Date(profile.created_at).toLocaleDateString("pt-BR")}
        </p>
      </div>
      <div className="flex gap-1.5">
        {onMakeAdmin && (
          <Button size="sm" variant="secondary" onClick={onMakeAdmin} className="text-xs">
            <UserCheck className="size-3" /> Tornar admin
          </Button>
        )}
        {onMakeOperator && (
          <Button size="sm" variant="secondary" onClick={onMakeOperator} className="text-xs">
            <UserX className="size-3" /> Tornar operador
          </Button>
        )}
      </div>
    </div>
  );
}

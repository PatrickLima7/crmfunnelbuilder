import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { callAccountFunction } from "@/lib/account-actions";
import type { Profile } from "@/lib/supabase-types";

export function ConsultantAccessDialog({ profile }: { profile: Profile }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(profile.name);
  const [username, setUsername] = useState(profile.username ?? "");
  const [goal, setGoal] = useState(profile.daily_contacts_goal ?? 80);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(action: "edit" | "reset-password") {
    if (action === "reset-password" && password !== confirmation) { toast.error("As senhas não conferem."); return; }
    setBusy(true);
    try {
      await callAccountFunction("create-operator", action === "edit"
        ? { action, id: profile.id, name, username, goal }
        : { action, id: profile.id, password });
      await qc.invalidateQueries({ queryKey: ["profiles"] });
      toast.success(action === "edit" ? "Consultor atualizado." : "Senha redefinida. Informe a nova senha diretamente ao consultor.");
      setPassword(""); setConfirmation("");
      if (action === "edit") setOpen(false);
    } catch (error) { toast.error(error instanceof Error ? error.message : "Falha ao salvar."); }
    finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={(next) => {
    if (busy) return;
    setOpen(next); setName(profile.name); setUsername(profile.username ?? "");
    setGoal(profile.daily_contacts_goal ?? 80); setPassword(""); setConfirmation("");
  }}>
    <DialogTrigger asChild><Button size="sm" variant="outline" className="h-7 text-xs">Editar / Senha</Button></DialogTrigger>
    <DialogContent className="max-h-[90vh] overflow-y-auto">
      <DialogHeader><DialogTitle>Editar consultor</DialogTitle></DialogHeader>
      <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void save("edit"); }}>
        <Label>Nome<Input required value={name} maxLength={200} onChange={(e) => setName(e.target.value)} /></Label>
        <Label>Usuário<Input required value={username} minLength={3} maxLength={80} pattern="[a-z0-9][a-z0-9._-]{2,79}" autoCapitalize="none" autoComplete="off" onChange={(e) => setUsername(e.target.value.toLowerCase())} /></Label>
        <p className="text-xs text-muted-foreground">Use letras sem acentos, números, ponto, traço ou sublinhado. O usuário é único.</p>
        <Label>Meta de contatos<Input required type="number" min={1} max={10000} value={goal} onChange={(e) => setGoal(Number(e.target.value))} /></Label>
        <Button type="submit" disabled={busy}>Salvar cadastro</Button>
      </form>
      <form className="space-y-3 border-t pt-4" onSubmit={(event) => { event.preventDefault(); void save("reset-password"); }}>
        <p className="font-semibold">Redefinir senha</p>
        <p className="text-xs text-muted-foreground">A senha anterior será substituída. Não é necessário e-mail.</p>
        <Label>Nova senha<Input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} /></Label>
        <Label>Confirmar nova senha<Input required type="password" minLength={8} maxLength={128} autoComplete="new-password" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></Label>
        <Button type="submit" disabled={busy} variant="secondary">Redefinir senha</Button>
      </form>
    </DialogContent>
  </Dialog>;
}

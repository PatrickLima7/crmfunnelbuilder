import { useState } from "react";
import { Megaphone, Plus, Power, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useMidias, useCreateMidia, useUpdateMidia, useDeleteMidia } from "@/hooks/useMidias";

export function MidiasTab() {
  const { data: midias, isLoading } = useMidias();
  const createMidia = useCreateMidia();
  const updateMidia = useUpdateMidia();
  const deleteMidia = useDeleteMidia();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newMidiaName, setNewMidiaName] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMidiaName.trim()) return;
    createMidia.mutate(newMidiaName, {
      onSuccess: () => {
        setNewMidiaName("");
        setIsCreateOpen(false);
      }
    });
  };

  const toggleStatus = (id: string, currentStatus: boolean) => {
    updateMidia.mutate({ id, updates: { ativo: !currentStatus } });
  };

  const handleDelete = (id: string) => {
    deleteMidia.mutate(id);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium flex items-center gap-2">
            <Megaphone className="size-5 text-primary" />
            Tipos de Mídia
          </h2>
          <p className="text-sm text-muted-foreground">
            Gerencie as origens de mídia (ex: Facebook Ads, Google Ads, Orgânico) para classificação de leads.
          </p>
        </div>
        
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="size-4" />
              Nova Mídia
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Cadastrar Mídia</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome da Mídia</Label>
                  <Input 
                    id="nome" 
                    value={newMidiaName}
                    onChange={(e) => setNewMidiaName(e.target.value)}
                    placeholder="Ex: Google Ads"
                    autoFocus
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMidia.isPending || !newMidiaName.trim()}>
                  {createMidia.isPending ? <Loader2 className="size-4 animate-spin" /> : "Salvar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-md">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted/50 border-b">
            <tr>
              <th className="h-10 px-4 font-medium">Nome</th>
              <th className="h-10 px-4 font-medium">Status</th>
              <th className="h-10 px-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={3} className="h-24 text-center">
                  <Loader2 className="size-6 animate-spin mx-auto text-muted-foreground" />
                </td>
              </tr>
            ) : midias?.length === 0 ? (
              <tr>
                <td colSpan={3} className="h-24 text-center text-muted-foreground">
                  Nenhuma mídia cadastrada.
                </td>
              </tr>
            ) : (
              midias?.map((midia) => (
                <tr key={midia.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{midia.nome}</td>
                  <td className="px-4 py-3">
                    <Badge variant={midia.ativo ? "default" : "secondary"} className={midia.ativo ? "bg-green-500/10 text-green-500 hover:bg-green-500/20" : ""}>
                      {midia.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => toggleStatus(midia.id, midia.ativo)}
                        className={midia.ativo ? "text-amber-500" : "text-green-500"}
                        title={midia.ativo ? "Desativar" : "Ativar"}
                        disabled={updateMidia.isPending}
                      >
                        <Power className="size-4" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" className="text-destructive" title="Excluir">
                            <Trash2 className="size-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir mídia?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir a mídia "{midia.nome}"? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction 
                              onClick={() => handleDelete(midia.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useState } from "react";
import { GraduationCap, Plus, Power, Shield, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useCursos,
  useCreateCurso,
  useUpdateCurso,
  useDeleteCurso,
  DEFAULT_CURSO_NAME,
} from "@/hooks/useCursos";

export function CursosTab() {
  const { data: cursos = [], isLoading } = useCursos();
  const createCurso = useCreateCurso();
  const updateCurso = useUpdateCurso();
  const deleteCurso = useDeleteCurso();

  const [openModal, setOpenModal] = useState(false);
  const [newNome, setNewNome] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNome.trim()) return;
    await createCurso.mutateAsync(newNome.trim());
    setNewNome("");
    setOpenModal(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <GraduationCap className="size-5 text-primary" /> Gerenciamento de Cursos
          </h2>
          <p className="text-xs text-muted-foreground">
            Cadastre os cursos oferecidos para seleção no cadastro de novos leads. O curso padrão "Não identificado" é mantido fixo.
          </p>
        </div>

        <Dialog open={openModal} onOpenChange={setOpenModal}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1 text-xs">
              <Plus className="size-4" /> Novo Curso
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GraduationCap className="size-5 text-primary" /> Cadastrar Novo Curso
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Nome do Curso *</Label>
                <Input
                  placeholder="Ex: Pós-Graduação em Gestão de Pessoas"
                  value={newNome}
                  onChange={(e) => setNewNome(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>
              <div className="flex gap-2 justify-end pt-2">
                <Button type="button" variant="secondary" onClick={() => setOpenModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createCurso.isPending || !newNome.trim()}>
                  {createCurso.isPending ? "Salvando..." : "Cadastrar Curso"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
            Carregando cursos...
          </div>
        ) : cursos.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
            Nenhum curso cadastrado.
          </div>
        ) : (
          <table className="w-full text-xs text-left">
            <thead className="bg-muted border-b border-border text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Nome do Curso</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Data de Cadastro</th>
                <th className="px-4 py-2.5 font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {cursos.map((curso) => {
                const isDefault = curso.nome.toLowerCase() === DEFAULT_CURSO_NAME.toLowerCase();
                return (
                  <tr key={curso.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium flex items-center gap-2">
                      <span className="font-semibold text-foreground">{curso.nome}</span>
                      {isDefault && (
                        <Badge variant="outline" className="text-[10px] border-primary/40 bg-primary/10 text-primary gap-1">
                          <Shield className="size-3" /> Padrão Fixo
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {curso.ativo ? (
                        <Badge variant="outline" className="text-[10px] border-success/40 bg-success/15 text-success">
                          Ativo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] border-muted bg-muted text-muted-foreground">
                          Inativo
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">
                      {new Date(curso.created_at).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="size-7 text-muted-foreground hover:text-foreground"
                          title={curso.ativo ? "Inativar curso" : "Ativar curso"}
                          onClick={() => updateCurso.mutate({ id: curso.id, updates: { ativo: !curso.ativo } })}
                        >
                          <Power className="size-3.5" />
                        </Button>

                        {!isDefault && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="size-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                                title="Excluir curso"
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir curso?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  O curso "{curso.nome}" será excluído permanentemente do sistema.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  className="bg-destructive text-destructive-foreground"
                                  onClick={() => deleteCurso.mutate({ id: curso.id, nome: curso.nome })}
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

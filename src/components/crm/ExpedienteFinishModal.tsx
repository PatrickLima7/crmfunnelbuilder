import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Phone, Trophy, Coffee, CheckCircle2 } from "lucide-react";
import { formatClock } from "@/lib/crm-data";

interface ExpedienteFinishModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  summary: {
    durationSeconds: number;
    contactsCount: number;
    conversionsCount: number;
    pauseSeconds: number;
  };
}

export function ExpedienteFinishModal({
  open,
  onClose,
  onConfirm,
  isLoading = false,
  summary,
}: ExpedienteFinishModalProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o && !isLoading) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Clock className="size-5 text-primary" /> Encerramento de Expediente
          </DialogTitle>
          <DialogDescription>
            Confira o resumo das suas atividades no expediente de hoje antes de encerrar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border bg-muted/40 p-3 flex flex-col items-center justify-center text-center">
              <Clock className="size-5 text-muted-foreground mb-1" />
              <span className="text-xs text-muted-foreground font-medium">Tempo Trabalhado</span>
              <span className="text-lg font-bold font-mono text-foreground mt-0.5">
                {formatClock(summary.durationSeconds)}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-3 flex flex-col items-center justify-center text-center">
              <Phone className="size-5 text-primary mb-1" />
              <span className="text-xs text-muted-foreground font-medium">Contatos no Turno</span>
              <span className="text-lg font-bold text-foreground mt-0.5">
                {summary.contactsCount}
              </span>
            </div>

            <div className="rounded-xl border border-success/30 bg-success/10 p-3 flex flex-col items-center justify-center text-center">
              <Trophy className="size-5 text-success mb-1" />
              <span className="text-xs text-success font-medium">Conversões do Turno</span>
              <span className="text-xl font-black text-success mt-0.5">
                {summary.conversionsCount}
              </span>
            </div>

            <div className="rounded-xl border border-border bg-muted/40 p-3 flex flex-col items-center justify-center text-center">
              <Coffee className="size-5 text-amber-500 mb-1" />
              <span className="text-xs text-muted-foreground font-medium">Tempo em Pausas</span>
              <span className="text-lg font-bold font-mono text-foreground mt-0.5">
                {formatClock(summary.pauseSeconds)}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground border border-border/50">
            <p className="flex items-center gap-1.5 font-medium text-foreground">
              <CheckCircle2 className="size-4 text-primary shrink-0" />
              Ao encerrar, um log completo deste expediente será registrado para auditoria. No seu próximo login ou reinício, seus contadores do turno começarão do zero.
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end pt-2">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Continuar Atendimento
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={isLoading}>
            {isLoading ? "Salvando log..." : "Encerrar Expediente Agora"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

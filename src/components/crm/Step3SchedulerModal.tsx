import { useState } from "react";
import { Calendar, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DateTimePicker } from "@/components/crm/DateTimePicker";
import { useCrm } from "@/lib/crm-store";

export function Step3SchedulerModal() {
  const crm = useCrm();
  const [callbackIso, setCallbackIso] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    return d.toISOString();
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (!callbackIso) {
      setError("Por favor, selecione data e hora para o retorno.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await crm.finishStep3Schedule(callbackIso);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={crm.step3ScheduleOpen} onOpenChange={(open) => { if (!open) crm.closeStep3Schedule(); }}>
      <DialogContent className="max-w-md rounded-2xl p-6 shadow-2xl space-y-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Calendar className="size-5 text-primary" />
            Agendar Próximo Retorno (Obrigatório)
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            A mensagem WhatsApp (3ª etapa) foi registrada para <strong className="text-foreground">{crm.lead.name}</strong>. Defina obrigatoriamente quando o consultor deve retornar o contato com este lead.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 rounded-xl border border-primary/30 bg-primary/5 p-4">
          <DateTimePicker
            label="Data e hora do próximo retorno *"
            value={callbackIso}
            onChange={(iso) => {
              setCallbackIso(iso);
              setError(null);
            }}
            error={error}
            required
          />
        </div>

        <Button
          className="w-full gap-2 font-bold"
          variant="success"
          disabled={!callbackIso || submitting}
          onClick={() => void handleConfirm()}
        >
          <CheckCircle2 className="size-4" />
          {submitting ? "Salvando agendamento..." : "Confirmar Agendamento e Avançar Fila"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}

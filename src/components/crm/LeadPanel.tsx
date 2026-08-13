import { CheckCircle2, Circle, Loader2, MessageCircle, Phone, PhoneCall, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { STEPS, formatClock } from "@/lib/crm-data";
import { useCrm } from "@/lib/crm-store";
import { CallScriptModal } from "./CallScriptModal";
import { WhatsappChat } from "./WhatsappChat";


export function LeadPanel({ operator }: { operator: string }) {
  const crm = useCrm();
  const allDone = crm.stepDone.every(Boolean);
  const current = STEPS[crm.stepIndex]!;
  const stepLate = crm.stepSeconds > 300;

  return (
    <section className="min-w-0 space-y-4 p-4">
      <h1 className="text-xl font-extrabold tracking-tight">
        BEM VINDO, <span className="text-primary">{operator}</span>
      </h1>

      {crm.loadingLead ? (
        <div className="flex h-56 flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-border bg-panel">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Buscando próximo lead...</p>
        </div>
      ) : (
        <div key={crm.lead.id} className="animate-lead-in space-y-4">
          <div className="rounded-[var(--radius)] border border-border bg-panel p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Lead em atendimento
                </p>
                <h2 className="truncate text-2xl font-bold">{crm.lead.name}</h2>
                <p className="font-mono text-sm text-muted-foreground">{crm.lead.phone}</p>
                <p className="text-sm text-muted-foreground">{crm.lead.profession}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {crm.lead.isNew && <Badge className="bg-success text-success-foreground">Lead novo</Badge>}
                <span
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-sm ${stepLate ? "animate-pulse-alert bg-destructive text-destructive-foreground" : "bg-muted text-foreground"}`}
                >
                  <Timer className="size-3.5" /> {formatClock(crm.stepSeconds)}
                </span>
              </div>
            </div>
          </div>

          <div className="rounded-[var(--radius)] border border-border bg-panel p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Protocolo de contato — etapa {Math.min(crm.stepIndex + 1, 3)} de 3
            </p>

            <ol className="mt-3 space-y-3">
              {STEPS.map((step, i) => {
                const done = crm.stepDone[i];
                const active = i === crm.stepIndex && !done;
                return (
                  <li
                    key={step.key}
                    className={`rounded-[var(--radius)] border p-3 transition-colors ${
                      active
                        ? "border-primary/60 bg-primary/10"
                        : done
                          ? "border-success/40 bg-success/5"
                          : "border-border opacity-60"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {done ? (
                        <CheckCircle2 className="size-4 shrink-0 text-success" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {i + 1}. {step.label}
                      </span>

                      {active && step.key === "call" && (
                        <div className="flex gap-2">
                          <Button size="sm" variant="destructive" onClick={crm.notAnswered}>
                            <Phone /> Não atendeu
                          </Button>
                          <Button size="sm" variant="success" onClick={crm.answered}>
                            <PhoneCall /> Atendeu
                          </Button>
                        </div>
                      )}
                      {active && step.key === "whatsapp_call" && (
                        <Button size="sm" variant="whatsapp" onClick={crm.sendWhatsappCall}>
                          <PhoneCall /> Enviar
                        </Button>
                      )}
                      {active && step.key === "whatsapp_msg" && (
                        <Button size="sm" variant="whatsapp" onClick={crm.sendWhatsappMessage}>
                          <MessageCircle /> Enviar mensagem
                        </Button>
                      )}
                    </div>
                    {active && <p className="mt-2 text-xs text-muted-foreground">{step.hint}</p>}
                  </li>
                );
              })}
            </ol>

            <div className="mt-4 rounded-[var(--radius)] border border-warning/40 bg-warning/10 p-3 text-sm">
              <span className="font-semibold text-warning">Dica rápida: </span>
              {allDone ? "Etapas concluídas — registre observações e avance para o próximo lead." : current.hint}
            </div>

            <Button
              className="mt-4 w-full"
              variant={allDone ? "success" : "secondary"}
              disabled={!allDone || crm.loadingLead}
              onClick={crm.nextLead}
            >
              {allDone ? "Próximo lead" : "Complete as 3 etapas para avançar"}
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}

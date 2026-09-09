import { CheckCircle2, Circle, Loader2, MessageSquare, Phone, PhoneCall, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatClock, STEPS } from "@/lib/crm-data";
import { useCrm } from "@/lib/crm-store";
import { CallScriptModal } from "./CallScriptModal";
import { BlockingAlertModal } from "./BlockingAlertModal";

export function LeadPanel({ operator }: { operator: string }) {
  const crm = useCrm();
  const stepLate = crm.stepSeconds > 300;

  // null lead state — actual lead.id === "empty" is our sentinel
  const hasRealLead = crm.lead.id !== "empty";

  // Status badge colors
  const statusColor =
    crm.lead.status === "quente"
      ? "bg-hot text-white"
      : crm.lead.status === "morno"
        ? "bg-warm text-white"
        : "bg-muted text-muted-foreground";

  return (
    <section className="flex min-h-0 min-w-0 flex-col gap-3 p-4 lg:h-full lg:overflow-hidden">
      <h1 className="shrink-0 truncate text-lg font-extrabold tracking-tight">
        BEM VINDO, <span className="text-primary">{operator}</span>
      </h1>

      {crm.loadingLead ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-[var(--radius)] border border-border bg-panel">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Buscando próximo lead...</p>
        </div>
      ) : !hasRealLead ? (
        /* ── Empty queue state ── */
        <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-[var(--radius)] border border-dashed border-border bg-panel p-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-muted">
            <Phone className="size-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-base font-bold">Nenhum lead disponível</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Sua fila está vazia. Aguarde novos leads serem importados pelo administrador ou selecione um lead da sua carteira à direita.
            </p>
          </div>
        </div>
      ) : (
        <div key={crm.lead.id} className="flex min-h-0 flex-1 animate-lead-in flex-col gap-3">

          {/* ── Lead card ── */}
          <div className="shrink-0 rounded-[var(--radius)] border border-border bg-panel p-4">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
              <div className="min-w-0 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Lead em atendimento
                </p>
                <h2 className="truncate text-2xl font-bold">{crm.lead.name}</h2>
                {crm.lead.phone && (
                  <p className="font-mono text-sm font-semibold text-primary">{crm.lead.phone}</p>
                )}

                {/* Apenas os campos visíveis autorizados ao operador */}
                {crm.lead.curso && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Curso de interesse:</span> {crm.lead.curso}
                  </p>
                )}
                {crm.lead.city && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Cidade:</span> {crm.lead.city}
                    {crm.lead.state ? ` / ${crm.lead.state}` : ""}
                  </p>
                )}
                {(crm.lead.midia || crm.lead.origin) && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Mídia:</span> {crm.lead.midia || crm.lead.origin}
                  </p>
                )}
                {crm.lead.createdAt && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Data/Hora do cadastro:</span> {new Date(crm.lead.createdAt).toLocaleString("pt-BR")}
                  </p>
                )}
                {(crm.lead.notes || (crm.lead as any).observacao) && (
                  <p className="mt-1 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Observação final:</span> {crm.lead.notes || (crm.lead as any).observacao}
                  </p>
                )}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                {crm.lead.isNew && (
                  <Badge className="bg-success text-success-foreground">Lead novo</Badge>
                )}
                <Badge className={statusColor + " capitalize"}>
                  {crm.lead.status}
                </Badge>
                <span
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono text-sm ${
                    stepLate
                      ? "animate-pulse-alert bg-destructive text-destructive-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  <Timer className="size-3.5" /> {formatClock(crm.stepSeconds)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Protocolo de Ligações ── */}
          <div className="shrink-0 rounded-[var(--radius)] border border-border bg-panel p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Protocolo de atendimento (3 etapas)
            </p>

            <div className="mt-3 space-y-2">
              {STEPS.map((step, idx) => {
                const isWhatsAppMessage = step.key === "whatsapp_message";
                const isActive = !crm.stepDone[idx] && (idx === 0 || crm.stepDone[idx - 1]);

                return (
                  <div
                    key={step.key}
                    className={`rounded-[var(--radius)] border p-3 transition-colors ${
                      crm.stepDone[idx]
                        ? "border-success/40 bg-success/5"
                        : isActive
                          ? "border-primary/60 bg-primary/10"
                          : "border-border bg-muted/30 opacity-60"
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {crm.stepDone[idx] ? (
                        <CheckCircle2 className="size-4 shrink-0 text-success" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                        {step.label}
                      </span>
                      {isActive && (
                        <div className="flex gap-2">
                          {isWhatsAppMessage ? (
                            /* Step 3: WhatsApp message — no call modal, just "sent" button */
                            <>
                              <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => void crm.whatsappSent()}
                              >
                                <MessageSquare className="size-3.5" /> Mensagem enviada
                              </Button>
                            </>
                          ) : (
                            /* Steps 1 & 2: phone/WhatsApp call — open script modal */
                            <>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => void crm.notAnswered(idx)}
                              >
                                <Phone className="size-3.5" /> Não atendeu
                              </Button>
                              <Button
                                size="sm"
                                variant="success"
                                onClick={() => crm.answered(idx)}
                              >
                                <PhoneCall className="size-3.5" /> Atendeu
                              </Button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {step.hint}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Hint */}
            <div className="mt-3 rounded-[var(--radius)] border border-warning/40 bg-warning/10 p-2.5 text-xs">
              <span className="font-semibold text-warning">Dica: </span>
              {crm.stepDone.every(Boolean)
                ? "Todas as etapas concluídas — avance para o próximo lead."
                : "Complete cada etapa na ordem: 1ª Ligação (operadora) → 2ª Ligação (WhatsApp) → 3ª Mensagem WhatsApp."}
            </div>

            {/* Script modal trigger + Next lead button */}
            <div className="mt-3 flex gap-2">
              <CallScriptModal />
              <Button
                className="flex-1"
                variant={crm.stepDone.every(Boolean) ? "success" : "secondary"}
                disabled={!crm.stepDone.every(Boolean) || crm.loadingLead}
                onClick={crm.nextLead}
              >
                {crm.stepDone.every(Boolean) ? "✓ Próximo lead" : "Complete todas as etapas para avançar"}
              </Button>
            </div>
          </div>

          {/* ── Ligação em andamento ── */}
          {crm.callOpen && (
            <div className="shrink-0 rounded-[var(--radius)] border border-success/50 bg-success/10 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-bold text-success">
                  📞 Em ligação com {crm.lead.name}
                </p>
                <span className="font-mono text-lg font-bold text-success">
                  {formatClock(crm.callSeconds)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Use o script de ligação aberto para registrar o desfecho e encerrar a ligação.
              </p>
            </div>
          )}
        </div>
      )}
      <BlockingAlertModal alert={crm.blockingAlert} />
    </section>
  );
}

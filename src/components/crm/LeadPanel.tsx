import { CheckCircle2, Circle, Loader2, Phone, PhoneCall, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatClock } from "@/lib/crm-data";
import { useCrm } from "@/lib/crm-store";
import { CallScriptModal } from "./CallScriptModal";

export function LeadPanel({ operator }: { operator: string }) {
  const crm = useCrm();
  const stepLate = crm.stepSeconds > 300;

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
      ) : (
        <div key={crm.lead.id} className="flex min-h-0 flex-1 animate-lead-in flex-col gap-3">

          {/* ── Lead card ── */}
          <div className="shrink-0 rounded-[var(--radius)] border border-border bg-panel p-4">
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

          {/* ── Ligação ── */}
          <div className="shrink-0 rounded-[var(--radius)] border border-border bg-panel p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Protocolo de contato
            </p>

            <div className="mt-3 space-y-2">
              {/* Step: Ligação */}
              <div
                className={`rounded-[var(--radius)] border p-3 transition-colors ${
                  !crm.stepDone[0]
                    ? "border-primary/60 bg-primary/10"
                    : "border-success/40 bg-success/5"
                }`}
              >
                <div className="flex flex-wrap items-center gap-3">
                  {crm.stepDone[0] ? (
                    <CheckCircle2 className="size-4 shrink-0 text-success" />
                  ) : (
                    <Circle className="size-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    Ligação telefônica
                  </span>
                  {!crm.stepDone[0] && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="destructive" onClick={crm.notAnswered}>
                        <Phone /> Não atendeu
                      </Button>
                      <Button size="sm" variant="success" onClick={crm.answered}>
                        <PhoneCall /> Atendeu
                      </Button>
                    </div>
                  )}
                </div>
                {!crm.stepDone[0] && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Apresente-se, confirme o interesse e use o script abaixo como guia.
                  </p>
                )}
              </div>
            </div>

            {/* Hint */}
            <div className="mt-3 rounded-[var(--radius)] border border-warning/40 bg-warning/10 p-2.5 text-xs">
              <span className="font-semibold text-warning">Dica: </span>
              {crm.stepDone[0]
                ? "Ligação registrada — adicione observações ao lead se necessário e avance."
                : "Ligue agora. Se não atender, registre e avance para o próximo."}
            </div>

            {/* Script modal trigger */}
            <div className="mt-3 flex gap-2">
              <CallScriptModal />
              <Button
                className="flex-1"
                variant={crm.stepDone[0] ? "success" : "secondary"}
                disabled={!crm.stepDone[0] || crm.loadingLead}
                onClick={crm.nextLead}
              >
                {crm.stepDone[0] ? "✓ Próximo lead" : "Complete a ligação para avançar"}
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
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="success"
                  className="w-full"
                  onClick={() => crm.finishCall("interessado")}
                >
                  🎯 Interessado
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => crm.finishCall("pensar")}
                >
                  🤔 Vai pensar
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  className="w-full"
                  onClick={() => crm.finishCall("nao")}
                >
                  ✗ Não quer
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  className="w-full"
                  onClick={() => crm.finishCall("revisao")}
                >
                  📋 Revisão
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

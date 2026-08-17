import { Clock, Layers, Zap } from "lucide-react";
import { PRIORITY_LEADS, QUEUE, formatClock, type LeadStatus } from "@/lib/crm-data";
import { useCrm } from "@/lib/crm-store";

const statusClass: Record<LeadStatus, string> = {
  quente: "bg-hot/20 text-hot",
  morno: "bg-warm/20 text-warm",
  frio: "bg-cold/20 text-muted-foreground",
};

export function OpportunitiesPanel() {
  const crm = useCrm();

  return (
    <aside className="space-y-3 border-border bg-sidebar p-4 lg:border-l">
      <div className="stat-card">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Seus leads prioritários
        </p>
        <div className="mt-2 max-h-72 overflow-x-auto overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-muted-foreground">
                <th className="pb-1 pr-2">Top</th>
                <th className="pb-1 pr-2">Nome</th>
                <th className="pb-1 pr-2">Retorno</th>
                <th className="pb-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {PRIORITY_LEADS.map((l, i) => (
                <tr key={l.name} className="border-t border-border/60">
                  <td className="py-1.5 pr-2 font-mono text-muted-foreground">{i + 1}</td>
                  <td className="py-1.5 pr-2 font-medium">{l.name}</td>
                  <td className="py-1.5 pr-2 font-mono">{l.time}</td>
                  <td className="py-1.5">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${statusClass[l.status]}`}>
                      {l.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <button className="mt-2 text-xs font-semibold text-primary hover:underline">
          VER TODOS (38)
        </button>
      </div>

      <div className="stat-card">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Layers className="size-3.5" /> Fila de oportunidades
        </p>
        <p className="mt-1 font-mono text-2xl font-bold">{QUEUE.total.toLocaleString("pt-BR")} <span className="text-xs font-normal text-muted-foreground">LEADS</span></p>
        <dl className="mt-2 space-y-1 text-sm">
          {[
            ["Em nutrição", QUEUE.nutrindo],
            ["Nutridos hoje", QUEUE.nutridosHoje],
            ["Para reativar", QUEUE.reativar],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between">
              <dt className="text-muted-foreground">{label}</dt>
              <dd className="font-mono">{Number(value).toLocaleString("pt-BR")}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="stat-card">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <Clock className="size-3.5" /> Timing do próximo lead
        </p>
        <div className="mt-1 flex items-center justify-between">
          <span className="font-mono text-2xl font-bold text-success">{formatClock(crm.nextLeadIn)}</span>
          <span className="flex items-center gap-1 rounded-full bg-primary/20 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <Zap className="size-3" /> AUTOMÁTICO
          </span>
        </div>
      </div>
    </aside>
  );
}

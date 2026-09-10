import { useState } from "react";
import { Clock, Search, Download, Calendar, User, Phone, Trophy, Coffee, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAllExpedienteLogs } from "@/hooks/useExpediente";
import { formatClock } from "@/lib/crm-data";

export function ExpedientesTab() {
  const { data: logs = [], isLoading } = useAllExpedienteLogs();
  const [search, setSearch] = useState("");

  const filteredLogs = logs.filter((l) => {
    const term = search.toLowerCase();
    const opName = (l.operator as any)?.name?.toLowerCase() ?? "";
    const opEmail = (l.operator as any)?.email?.toLowerCase() ?? "";
    const dateStr = new Date(l.started_at).toLocaleDateString("pt-BR");
    return opName.includes(term) || opEmail.includes(term) || dateStr.includes(term);
  });

  const totalShifts = filteredLogs.length;
  const totalDurationSec = filteredLogs.reduce((acc, l) => acc + (l.duration_seconds ?? 0), 0);
  const totalContacts = filteredLogs.reduce((acc, l) => acc + (l.contacts_count ?? 0), 0);
  const totalConversions = filteredLogs.reduce((acc, l) => acc + (l.conversions_count ?? 0), 0);

  const exportCsv = () => {
    if (filteredLogs.length === 0) return;

    const headers = ["Vendedor", "E-mail", "Data", "Hora Início", "Hora Fim", "Duração (HH:MM:SS)", "Contatos", "Conversões", "Pausas (seg)"];
    const rows = filteredLogs.map((l) => [
      `"${(l.operator as any)?.name ?? "N/A"}"`,
      `"${(l.operator as any)?.email ?? "N/A"}"`,
      `"${new Date(l.started_at).toLocaleDateString("pt-BR")}"`,
      `"${new Date(l.started_at).toLocaleTimeString("pt-BR")}"`,
      `"${l.ended_at ? new Date(l.ended_at).toLocaleTimeString("pt-BR") : "Em andamento"}"`,
      `"${formatClock(l.duration_seconds ?? 0)}"`,
      l.contacts_count ?? 0,
      l.conversions_count ?? 0,
      l.pause_seconds ?? 0,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `relatorio_expedientes_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Clock className="size-5 text-primary" /> Logs de Expedientes dos Vendedores
          </h2>
          <p className="text-xs text-muted-foreground">
            Auditoria completa de todos os turnos de trabalho, horários de início/fim, ligações e conversões por expediente.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={exportCsv} disabled={filteredLogs.length === 0}>
          <FileSpreadsheet className="size-4 text-emerald-500" /> Exportar CSV
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground font-medium">Expedientes Registrados</p>
          <p className="text-xl font-bold mt-1">{totalShifts}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground font-medium">Tempo Total em Turno</p>
          <p className="text-xl font-bold font-mono mt-1">{formatClock(totalDurationSec)}</p>
        </div>
        <div className="rounded-xl border border-border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground font-medium">Contatos no Período</p>
          <p className="text-xl font-bold text-primary mt-1">{totalContacts}</p>
        </div>
        <div className="rounded-xl border border-success/30 bg-success/10 p-3">
          <p className="text-xs text-success font-medium">Conversões no Período</p>
          <p className="text-xl font-bold text-success mt-1">{totalConversions}</p>
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por vendedor ou data (ex: 10/09)..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 text-xs"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            Carregando logs de expediente...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 gap-2 text-xs text-muted-foreground">
            <Clock className="size-8 opacity-40" />
            <p>Nenhum log de expediente encontrado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted border-b border-border text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Vendedor</th>
                  <th className="px-4 py-2.5 font-semibold">Data</th>
                  <th className="px-4 py-2.5 font-semibold">Início</th>
                  <th className="px-4 py-2.5 font-semibold">Fim</th>
                  <th className="px-4 py-2.5 font-semibold">Duração</th>
                  <th className="px-4 py-2.5 font-semibold">Contatos</th>
                  <th className="px-4 py-2.5 font-semibold">Conversões</th>
                  <th className="px-4 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredLogs.map((log) => {
                  const opName = (log.operator as any)?.name ?? "Vendedor desativado";
                  const opEmail = (log.operator as any)?.email ?? "";
                  const startDate = new Date(log.started_at);
                  const isFinished = !!log.ended_at;

                  return (
                    <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-medium">
                        <div className="flex flex-col">
                          <span className="font-semibold text-foreground">{opName}</span>
                          <span className="text-[10px] text-muted-foreground">{opEmail}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono">{startDate.toLocaleDateString("pt-BR")}</td>
                      <td className="px-4 py-3 font-mono">{startDate.toLocaleTimeString("pt-BR")}</td>
                      <td className="px-4 py-3 font-mono">
                        {log.ended_at ? new Date(log.ended_at).toLocaleTimeString("pt-BR") : "—"}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold">
                        {formatClock(log.duration_seconds ?? 0)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-primary">
                        {log.contacts_count ?? 0}
                      </td>
                      <td className="px-4 py-3 font-bold text-success">
                        {log.conversions_count ?? 0}
                      </td>
                      <td className="px-4 py-3">
                        {isFinished ? (
                          <Badge variant="outline" className="text-[10px] border-border bg-muted">
                            Encerrado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] border-success/40 bg-success/15 text-success animate-pulse">
                            Em andamento
                          </Badge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

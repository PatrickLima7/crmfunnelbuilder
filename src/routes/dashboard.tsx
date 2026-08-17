import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/crm/Topbar";
import { MetricsSidebar } from "@/components/crm/MetricsSidebar";
import { LeadPanel } from "@/components/crm/LeadPanel";
import { OpportunitiesPanel } from "@/components/crm/OpportunitiesPanel";
import { CrmProvider, readCurrent } from "@/lib/crm-store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel do operador — Funil de Vendas CRM" },
      { name: "description", content: "Gerencie leads, etapas de contato, metas diárias e ritmo de conversão em tempo real no CRM Funil de Vendas." },
      { property: "og:title", content: "Painel do operador — Funil de Vendas CRM" },
      { property: "og:description", content: "Meta do dia, protocolo de contato e fila de oportunidades em uma única tela." },
    ],
  }),
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [operator, setOperator] = useState<string | null>(null);

  useEffect(() => {
    const session = readCurrent();
    if (!session) navigate({ to: "/", replace: true });
    else setOperator(session.name);
  }, [navigate]);

  if (!operator) return null;

  return (
    <CrmProvider>
      <div className="flex h-screen flex-col overflow-hidden">
        <Topbar operator={operator} />
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:overflow-hidden">
          <MetricsSidebar />
          <LeadPanel operator={operator} />
          <OpportunitiesPanel />
        </div>
      </div>
    </CrmProvider>
  );
}


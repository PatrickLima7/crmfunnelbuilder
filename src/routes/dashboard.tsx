import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/crm/Topbar";
import { MetricsSidebar } from "@/components/crm/MetricsSidebar";
import { LeadPanel } from "@/components/crm/LeadPanel";
import { OpportunitiesPanel } from "@/components/crm/OpportunitiesPanel";
import { CrmProvider, useCrm } from "@/lib/crm-store";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Painel do consultor — Funil de Vendas CRM" },
      { name: "description", content: "Gerencie leads, etapas de contato, metas diárias e ritmo de conversão em tempo real no CRM Funil de Vendas." },
      { property: "og:title", content: "Painel do consultor — Funil de Vendas CRM" },
      { property: "og:description", content: "Meta do dia, protocolo de contato e fila de oportunidades em uma única tela." },
    ],
  }),
  ssr: false,
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [operator, setOperator] = useState<string | null>(null);
  const [operatorId, setOperatorId] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session?.user) {
        navigate({ to: "/", replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, role, active")
        .eq("id", session.user.id)
        .single();

      if (!profile || !profile.active) {
        await supabase.auth.signOut();
        navigate({ to: "/", replace: true });
        return;
      }

      setOperator(profile.name);
      setOperatorId(profile.id);
      setChecking(false);

      // Ensure presence row exists for this operator
      await supabase.from("operator_presence").upsert(
        {
          operator_id: profile.id,
          state: "ocioso",
          contacts_today: 0,
          conversions_today: 0,
          talk_seconds: 0,
          pause_seconds: 0,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "operator_id", ignoreDuplicates: true },
      );

      // Ensure work session for today
      const today = new Date().toISOString().slice(0, 10);
      await supabase.from("work_sessions").upsert(
        { operator_id: profile.id, date: today },
        { onConflict: "operator_id,date", ignoreDuplicates: true },
      );
    });
  }, [navigate]);

  if (checking || !operator || !operatorId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <CrmProvider operatorId={operatorId}>
      <DashboardContent operator={operator} operatorId={operatorId} />
    </CrmProvider>
  );
}

function DashboardContent({ operator, operatorId }: { operator: string; operatorId: string }) {
  const crm = useCrm();
  const isShiftActive = crm.shiftActive;
  const blocked = !isShiftActive || !!crm.pause;

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Topbar operator={operator} operatorId={operatorId} />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {/* Main 3-column operational layout with grayscale / opacity block when shift is NOT started */}
        <div
          inert={blocked}
          aria-disabled={blocked}
          className={`grid h-full min-h-0 w-full grid-cols-1 overflow-y-auto transition-all duration-300 lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden ${
            blocked ? "grayscale opacity-40 pointer-events-none select-none filter cursor-not-allowed" : ""
          }`}
        >
          <MetricsSidebar />
          <LeadPanel operator={operator} />
          <OpportunitiesPanel operatorId={operatorId} />
        </div>

        {/* Overlay banner prompting consultant to start shift if not started */}
        {blocked && (
          <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-4">
            <div className="flex items-center gap-2.5 rounded-full border border-warning/40 bg-background/95 px-5 py-2 text-xs font-bold text-warning shadow-xl backdrop-blur">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-warning opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-warning" />
              </span>
              <span>{crm.pause ? "Em pausa — clique em Retomar no topo para liberar o atendimento" : 'Expediente não iniciado — Clique em "Iniciar Expediente" no topo verde para liberar o atendimento'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Topbar } from "@/components/crm/Topbar";
import { MetricsSidebar } from "@/components/crm/MetricsSidebar";
import { LeadPanel } from "@/components/crm/LeadPanel";
import { OpportunitiesPanel } from "@/components/crm/OpportunitiesPanel";
import { CrmProvider } from "@/lib/crm-store";
import { supabase } from "@/lib/supabase";

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
        .select("id, name, role")
        .eq("id", session.user.id)
        .single();

      if (!profile) {
        navigate({ to: "/", replace: true });
        return;
      }

      // Admins can also access the dashboard, redirect them to admin if they come here by accident
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
      <div className="flex h-screen flex-col overflow-hidden">
        <Topbar operator={operator} />
        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-y-auto lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:grid-rows-[minmax(0,1fr)] lg:overflow-hidden">
          <MetricsSidebar />
          <LeadPanel operator={operator} />
          <OpportunitiesPanel operatorId={operatorId} />
        </div>
      </div>
    </CrmProvider>
  );
}

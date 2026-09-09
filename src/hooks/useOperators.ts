import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { OperatorPresence } from "@/lib/supabase-types";
import type { Profile } from "@/lib/supabase-types";

export interface OperatorLiveData extends OperatorPresence {
  profile: Pick<Profile, "id" | "name"> | null;
}

/**
 * Hook for admin: subscribes to all operator presences in real time.
 * Returns live data updated via Supabase Realtime WebSocket.
 */
export function useOperatorsRealtime() {
  const [operators, setOperators] = useState<OperatorLiveData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial fetch
    async function fetchAll() {
      const { data, error } = await supabase
        .from("operator_presence")
        .select("*, profile:profiles(id, name)")
        .order("updated_at");

      if (!error && data) {
        setOperators(
          data.map((row: any) => ({
            ...row,
            profile: Array.isArray(row.profile) ? row.profile[0] ?? null : (row.profile as Pick<Profile, "id" | "name"> | null),
          })),
        );
      }
      setLoading(false);
    }

    fetchAll();

    // Realtime subscription
    const channel = supabase
      .channel("operator_presence_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "operator_presence" },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const oldId = (payload.old as { id?: string })['id'];
            setOperators((prev) => prev.filter((op) => op.id !== oldId));
            return;
          }

          const row = payload.new as OperatorPresence;

          // Fetch profile for this operator if we don't have it
          const { data: profileData } = await supabase
            .from("profiles")
            .select("id, name")
            .eq("id", row.operator_id)
            .single();

          const newEntry: OperatorLiveData = { ...row, profile: profileData ?? null };

          if (payload.eventType === "INSERT") {
            setOperators((prev) => [...prev, newEntry]);
          } else {
            setOperators((prev) =>
              prev.map((op) => (op.operator_id === row.operator_id ? newEntry : op)),
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return { operators, loading };
}

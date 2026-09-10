import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase-types";

const SUPABASE_URL = import.meta.env["VITE_SUPABASE_URL"] as string;
const SUPABASE_ANON_KEY = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local",
  );
}

/**
 * Supabase client — use this everywhere in the app.
 * Automatically handles auth session persistence via localStorage.
 */
const isServer = typeof window === "undefined";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: !isServer,
    autoRefreshToken: !isServer,
    detectSessionInUrl: !isServer,
    storageKey: "crm.supabase.session",
  },
  ...(isServer ? { realtime: { transport: null as any } } : {}),
});

export type { Database };

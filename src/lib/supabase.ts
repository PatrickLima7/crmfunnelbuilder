import { createClient } from "@supabase/supabase-js";
import type { Database } from "./supabase-types";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    "Missing Supabase env vars: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env.local",
  );
}

/**
 * Supabase client — use this everywhere in the app.
 * Automatically handles auth session persistence via localStorage.
 */
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: "crm.supabase.session",
  },
});

export type { Database };

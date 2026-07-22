import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Vite bakes VITE_* vars into the bundle at build time.
// The publishable/anon key is designed to be safe in client-side code.
// These MUST be set as environment variables — no fallback values so that
// a missing config fails loudly instead of silently using a wrong project.
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "[supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set. " +
      "Add them as environment variables before building.",
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: "pkce",
    storageKey: "goyal-traders-auth",
  },
  global: {
    headers: {
      "X-Client-Info": "goyal-traders-crm",
    },
  },
});

// ── Security: development-only RLS sanity check ──────────────────────────
if (import.meta.env.DEV) {
  queueMicrotask(async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) return;
      const { data, error } = await supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .limit(1);
      if (!error && data !== null) {
        console.warn(
          "[security] RLS check: anonymous role can read `customers`. " +
            "Verify Row Level Security policies in Supabase.",
        );
      }
    } catch {
      /* network or RLS error — expected, swallow */
    }
  });
}

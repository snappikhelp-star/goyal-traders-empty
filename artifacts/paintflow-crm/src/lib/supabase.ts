import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Vite bakes VITE_* vars into the bundle at build time.
// The publishable/anon key is designed to be safe in client-side code.
const supabaseUrl =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) ||
  "https://lqfgxmpaqutugnvbngrl.supabase.co";

const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ||
  "sb_publishable_n4481Pg5r5qZOy8FO15GGw_QY0ge6MK";

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

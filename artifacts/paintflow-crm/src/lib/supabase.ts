import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
  );
}

// ── Security: enforce HTTPS Supabase endpoint in production ──────────────
// Prevents accidental misconfiguration that would leak tokens over plain HTTP.
if (
  import.meta.env.PROD &&
  !supabaseUrl.startsWith("https://")
) {
  throw new Error(
    "Insecure Supabase URL: HTTPS is required for the production Supabase endpoint.",
  );
}

// ── Security: do NOT accept the service-role key in the browser ──────────
// Service-role keys bypass Row Level Security and must never reach the client.
// Best-effort detection — service-role JWTs have `"role":"service_role"` in
// their middle (payload) segment.
try {
  const payload = supabaseAnonKey.split(".")[1];
  if (payload) {
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    if (decoded.includes('"service_role"')) {
      throw new Error(
        "Refusing to start: VITE_SUPABASE_ANON_KEY contains a service_role token. " +
          "Use the publishable / anon key only in the browser.",
      );
    }
  }
} catch (e) {
  // Re-throw our own assertion; ignore decoding errors for non-JWT keys
  // (Supabase publishable keys like `sb_publishable_...` aren't JWTs).
  if (e instanceof Error && e.message.startsWith("Refusing to start")) throw e;
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
// In dev, log a warning if the anon role can read protected tables without
// authentication — indicates RLS is misconfigured. Skipped in production
// builds to avoid extra noise / requests.
if (import.meta.env.DEV) {
  // Run lazily so it does not block module init.
  queueMicrotask(async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      if (sess.session) return; // only check anon role
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

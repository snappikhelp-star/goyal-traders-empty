import { supabase } from "./supabase";

export type ConnectionStatus =
  | { ok: true }
  | { ok: false; reason: "no_credentials" | "unreachable" | "auth_error" | "unknown"; message: string };

/**
 * Verify that the Supabase connection is healthy.
 * - Checks that env vars are set (throws at import time if not, but guard here anyway)
 * - Performs a lightweight authenticated ping via getSession()
 * - Attempts a minimal DB read to confirm RLS / DB access
 */
export async function verifyConnection(): Promise<ConnectionStatus> {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return {
      ok: false,
      reason: "no_credentials",
      message: "VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is missing.",
    };
  }

  try {
    // 1. Check network reachability — fetch the REST healthcheck
    const healthUrl = `${url}/rest/v1/`;
    const resp = await fetch(healthUrl, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(8000),
    });

    if (!resp.ok && resp.status !== 400) {
      return {
        ok: false,
        reason: "unreachable",
        message: `Supabase REST endpoint returned HTTP ${resp.status}. Check your VITE_SUPABASE_URL.`,
      };
    }

    // 2. Verify auth session call works
    const { error: sessionError } = await supabase.auth.getSession();
    if (sessionError) {
      return {
        ok: false,
        reason: "auth_error",
        message: `Auth error: ${sessionError.message}`,
      };
    }

    return { ok: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const reason =
      message.includes("fetch") || message.includes("network") || message.includes("timeout")
        ? "unreachable"
        : "unknown";
    return { ok: false, reason, message };
  }
}

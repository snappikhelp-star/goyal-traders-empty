import {
  createContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import type { Database } from "@/lib/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export interface AuthSignInResult {
  error: AuthError | { name: string; message: string } | null;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<AuthSignInResult>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── Cross-tab session channel ────────────────────────────────────────────
// Used to broadcast sign-out so other open tabs invalidate immediately
// (prevents duplicate active sessions across windows).
const SESSION_CHANNEL = "goyal-traders-session";

function isSessionExpired(session: Session | null): boolean {
  if (!session) return true;
  if (!session.expires_at) return false;
  // expires_at is a unix timestamp (seconds)
  return session.expires_at * 1000 <= Date.now();
}

async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    // PGRST116 = no row found; ignore. Other errors are likely RLS denials —
    // surface a console warning but don't break the app.
    if (error.code !== "PGRST116") {
      console.warn("[auth] profile fetch error:", error.message);
    }
    return null;
  }
  return data;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const hydrateProfile = useCallback(async (u: User | null) => {
    if (!u) {
      setProfile(null);
      return;
    }
    try {
      const p = await fetchProfile(u.id);
      setProfile(p);
    } catch (e) {
      console.warn("[auth] profile hydrate failed:", e);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    // Cross-tab session broadcast channel
    const channel =
      typeof BroadcastChannel !== "undefined"
        ? new BroadcastChannel(SESSION_CHANNEL)
        : null;
    channelRef.current = channel;

    const applySession = (s: Session | null) => {
      if (!isMounted) return;
      setSession(s);
      setUser(s?.user ?? null);
    };

    // ── Initial session check + expiry validation ─────────────────────
    supabase.auth
      .getSession()
      .then(async ({ data: { session: s }, error }) => {
        if (error) {
          console.warn("[auth] getSession error:", error.message);
        }
        if (s && isSessionExpired(s)) {
          // Stale token in storage — sign out cleanly.
          await supabase.auth.signOut().catch(() => undefined);
          applySession(null);
          if (isMounted) await hydrateProfile(null);
        } else {
          applySession(s);
          if (isMounted) await hydrateProfile(s?.user ?? null);
        }
      })
      .catch((e) => {
        console.warn("[auth] getSession failed:", e);
        applySession(null);
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    // ── Auth state changes (also fires on token refresh / sign-out from
    //    another tab via persisted storage). ──────────────────────────
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      applySession(s);

      if (
        event === "SIGNED_IN" ||
        event === "TOKEN_REFRESHED" ||
        event === "USER_UPDATED"
      ) {
        hydrateProfile(s?.user ?? null);
      }

      if (event === "SIGNED_OUT") {
        setProfile(null);
      }
    });

    // ── Re-validate session when tab becomes visible again ────────────
    // Catches the case where a token expired while the tab was backgrounded
    // or another tab signed out.
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      supabase.auth.getSession().then(({ data: { session: s } }) => {
        if (s && isSessionExpired(s)) {
          supabase.auth.signOut().catch(() => undefined);
        } else {
          applySession(s);
        }
      });
    };
    document.addEventListener("visibilitychange", onVisibility);

    // ── Cross-tab sign-out propagation ───────────────────────────────
    if (channel) {
      channel.onmessage = (ev) => {
        if (ev?.data?.type === "signout") {
          // Force-clear local state; Supabase storage event will also fire.
          applySession(null);
          setProfile(null);
        }
      };
    }

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      document.removeEventListener("visibilitychange", onVisibility);
      channel?.close();
      channelRef.current = null;
    };
  }, [hydrateProfile]);

  // ── signIn: normalize input + structured errors ────────────────────────
  const signIn = useCallback(
    async (email: string, password: string): Promise<AuthSignInResult> => {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !password) {
        return {
          error: {
            name: "ValidationError",
            message: "Email and password are required.",
          },
        };
      }
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        return { error };
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : "Network error during sign-in. Please try again.";
        return { error: { name: "NetworkError", message } };
      }
    },
    [],
  );

  // ── signOut: best-effort, always clears local state ────────────────────
  const signOut = useCallback(async () => {
    let error: AuthError | null = null;
    try {
      const result = await supabase.auth.signOut();
      error = result.error;
      if (error) {
        console.warn("[auth] signOut error:", error.message);
      }
    } catch (e) {
      console.warn("[auth] signOut threw:", e);
    } finally {
      // Force-clear local state even if the network call failed.
      setSession(null);
      setUser(null);
      setProfile(null);
      // Notify other tabs.
      try {
        channelRef.current?.postMessage({ type: "signout" });
      } catch {
        /* ignore */
      }
    }
    return { error };
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, session, profile, loading, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

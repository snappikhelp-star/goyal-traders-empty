import { createContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

export interface AppUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  profileImageUrl: string | null;
}

export interface AuthContextType {
  user: AppUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  refetchUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

function toAppUser(u: User): AppUser {
  const meta = u.user_metadata ?? {};
  return {
    id: u.id,
    email: u.email ?? null,
    firstName: (meta.first_name as string | undefined) ?? null,
    lastName: (meta.last_name as string | undefined) ?? null,
    profileImageUrl: (meta.avatar_url as string | undefined) ?? null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const refetchUser = useCallback(async () => {
    const { data } = await supabase.auth.getUser();
    setUser(data.user ? toAppUser(data.user) : null);
  }, []);

  useEffect(() => {
    // Load session immediately
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ? toAppUser(data.session.user) : null);
      setLoading(false);
    });

    // Keep in sync with Supabase auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ? toAppUser(session.user) : null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    console.log("[auth] signInWithPassword →", {
      url: import.meta.env.VITE_SUPABASE_URL,
      email,
    });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      console.error("[auth] signInWithPassword error →", {
        message: error.message,
        status: error.status,
        code: (error as { code?: string }).code,
      });
      return { error: error.message };
    }
    console.log("[auth] signInWithPassword success → user:", data.user?.id);
    return { error: null };
  }, []);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated: !!user, refetchUser, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

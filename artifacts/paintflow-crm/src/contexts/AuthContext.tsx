import { createContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { api, ApiError } from "@/lib/api";

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
  login: () => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    try {
      const data = await api.get<AppUser>("/auth/user");
      setUser(data);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 401 || e.status === 404)) {
        setUser(null);
      } else {
        console.warn("[auth] failed to load user:", e);
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(() => {
    window.location.href = "/api/login";
  }, []);

  const logout = useCallback(() => {
    window.location.href = "/api/logout";
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated: !!user, refetchUser: fetchUser, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

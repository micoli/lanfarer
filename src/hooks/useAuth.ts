import { useCallback, useEffect, useState } from "react";
import { apiClient } from "../lib/api/client.ts";

interface AuthState {
  loading: boolean;
  authEnabled: boolean;
  username: string | null;
}

interface UseAuth extends AuthState {
  login: (username: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
}

export function useAuth(): UseAuth {
  const [state, setState] = useState<AuthState>({
    loading: true,
    authEnabled: false,
    username: null,
  });

  const check = useCallback(async () => {
    try {
      const { data, response } = await apiClient.GET("/__auth/me");
      if (response.ok && data) {
        setState({ loading: false, authEnabled: data.authEnabled, username: data.username ?? null });
      } else {
        setState({ loading: false, authEnabled: true, username: null });
      }
    } catch {
      setState({ loading: false, authEnabled: false, username: null });
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    try {
      const { data, response, error } = await apiClient.POST("/__auth/login", {
        body: { username, password },
      });
      if (response.ok && data) {
        setState({ loading: false, authEnabled: true, username: data.username });
        return null;
      }
      const err = error as { error?: string } | undefined;
      return err?.error ?? "error";
    } catch {
      return "error";
    }
  }, []);

  const logout = useCallback(async () => {
    await apiClient.POST("/__auth/logout", {});
    setState({ loading: false, authEnabled: true, username: null });
  }, []);

  return { ...state, login, logout };
}

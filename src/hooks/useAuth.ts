import { useCallback, useEffect, useState } from "react";
import { basePath } from "../lib/basePath.ts";

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
      const res = await fetch(`${basePath()}/__auth/me`);
      if (res.ok) {
        const data = (await res.json()) as { username: string | null; authEnabled: boolean };
        setState({ loading: false, authEnabled: data.authEnabled, username: data.username });
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
      const res = await fetch(`${basePath()}/__auth/login`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        setState({ loading: false, authEnabled: true, username });
        return null;
      }
      const data = (await res.json()) as { error?: string };
      return data.error ?? "error";
    } catch {
      return "error";
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${basePath()}/__auth/logout`, { method: "POST" });
    setState({ loading: false, authEnabled: true, username: null });
  }, []);

  return { ...state, login, logout };
}

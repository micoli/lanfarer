import { useQueryClient } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext } from "react";

// ── Context types ─────────────────────────────────────────────────────────────

interface DataContextValue {
  loading: boolean;
  saving: boolean;
  error: string | null;
  online: boolean;
  refresh: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const refresh = () => {
    void queryClient.invalidateQueries();
  };

  // ── Wrappers pour conserver l'interface existante ──────────────────────────

  const value: DataContextValue = {
    loading: false,
    saving: false,
    error: null,
    online: true,
    refresh,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside DataProvider");
  return ctx;
}

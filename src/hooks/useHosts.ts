import { useCallback, useEffect, useRef, useState } from "react";
import type { HostsData } from "../../plugins/contracts.ts";
import { basePath } from "../lib/basePath.ts";

interface HostsState {
  data: HostsData | null;
  isLoading: boolean;
  progress: number;
  progressLabel: string;
  error: Error | null;
  dataUpdatedAt: number;
}

const REFETCH_INTERVAL = 30_000;

export function useHosts() {
  const [state, setState] = useState<HostsState>({
    data: null,
    isLoading: true,
    progress: 0,
    progressLabel: "",
    error: null,
    dataUpdatedAt: 0,
  });

  const esRef = useRef<EventSource | null>(null);

  const connect = useCallback(() => {
    esRef.current?.close();
    setState((s) => ({ ...s, isLoading: true, progress: 0, progressLabel: "", error: null }));

    const es = new EventSource(`${basePath()}/__hosts`);
    esRef.current = es;

    es.addEventListener("progress", (e: MessageEvent) => {
      if (esRef.current !== es) return;
      const { pct, label } = JSON.parse(e.data as string) as { pct: number; label: string };
      setState((s) => ({ ...s, progress: pct, progressLabel: label }));
    });

    es.addEventListener("result", (e: MessageEvent) => {
      if (esRef.current !== es) return;
      const data = JSON.parse(e.data as string) as HostsData;
      setState({ data, isLoading: false, progress: 100, progressLabel: "", error: null, dataUpdatedAt: Date.now() });
      es.close();
    });

    es.onerror = () => {
      if (esRef.current !== es) return;
      setState((s) => ({ ...s, isLoading: false, error: new Error("Failed to load hosts") }));
      es.close();
    };
  }, []);

  useEffect(() => {
    connect();
    const interval = setInterval(connect, REFETCH_INTERVAL);
    return () => {
      esRef.current?.close();
      clearInterval(interval);
    };
  }, [connect]);

  return { ...state, refresh: connect };
}

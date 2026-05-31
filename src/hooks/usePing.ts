import { useEffect, useRef, useState } from "react";
import { basePath } from "../lib/basePath.ts";

const HISTORY_SIZE = 30;

export interface HostPingState {
  rtt: number | null;
  history: (number | null)[];
  min: number | null;
  avg: number | null;
  max: number | null;
  loss: number;
}

function computeStats(
  history: (number | null)[],
): Pick<HostPingState, "min" | "avg" | "max" | "loss"> {
  if (history.length === 0) return { min: null, avg: null, max: null, loss: 0 };
  const nums = history.filter((v): v is number => v !== null);
  const loss = Math.round(((history.length - nums.length) / history.length) * 100);
  if (nums.length === 0) return { min: null, avg: null, max: null, loss: 100 };
  return {
    min: Math.round(Math.min(...nums)),
    avg: Math.round(nums.reduce((a, b) => a + b, 0) / nums.length),
    max: Math.round(Math.max(...nums)),
    loss,
  };
}

export function usePing(ips: string[]): Map<string, HostPingState> {
  const [states, setStates] = useState<Map<string, HostPingState>>(new Map());
  const historyRef = useRef<Map<string, (number | null)[]>>(new Map());
  const esRef = useRef<EventSource | null>(null);
  const ipsKey = ips.join(",");

  useEffect(() => {
    if (ips.length === 0) return;

    esRef.current?.close();
    historyRef.current = new Map();
    setStates(new Map());

    const es = new EventSource(`${basePath()}/__ping?ips=${encodeURIComponent(ipsKey)}`);
    esRef.current = es;

    es.addEventListener("ping", (e: MessageEvent) => {
      const results = JSON.parse(e.data as string) as { ip: string; rtt: number | null }[];
      setStates((prev) => {
        const next = new Map(prev);
        for (const { ip, rtt } of results) {
          const hist = historyRef.current.get(ip) ?? [];
          hist.push(rtt);
          if (hist.length > HISTORY_SIZE) hist.shift();
          historyRef.current.set(ip, hist);
          next.set(ip, { rtt, history: [...hist], ...computeStats(hist) });
        }
        return next;
      });
    });

    return () => {
      esRef.current?.close();
    };
  }, [ipsKey, ips.length]);

  return states;
}

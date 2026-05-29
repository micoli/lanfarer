import { Wifi } from "lucide-react";
import { useEffect, useRef } from "react";
import { Sparkline } from "../../../../src/components/Sparkline.tsx";
import { useBandwidthNav } from "../../../../src/contexts/BandwidthNavContext.tsx";
import type { AirportAccessPoint } from "../hooks/useAirport.ts";
import { useAirportWireless } from "../hooks/useAirport.ts";

const MAX_HISTORY = 30;

interface BandPoint {
  ts: number;
  value: number; // kbps (sum of txrate_mbps * 1000 across clients)
}

interface BandHistory {
  [band: string]: BandPoint[];
}

function fmtRate(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(0)} Mb/s`;
  return `${kbps.toFixed(0)} Kb/s`;
}

function bandColor(band: string): string {
  return band === "5G" ? "#818cf8" : "#f59e0b";
}

function ApRow({ ap, history }: { ap: AirportAccessPoint; history: BandPoint[] }) {
  const totalKbps = ap.clients.reduce((s, c) => s + c.txrate_mbps * 1000, 0);
  const lastKbps = history[history.length - 1]?.value ?? 0;
  const color = bandColor(ap.band);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-slate-400">
        <span style={{ color }}>
          {ap.band} · ch {ap.channel} · {ap.clients.length} client{ap.clients.length !== 1 ? "s" : ""}
        </span>
        <span className="tabular-nums text-slate-300">
          {fmtRate(lastKbps)}
          {history.length > 1 && (
            <span className="text-slate-500"> / max {fmtRate(Math.max(...history.map((p) => p.value), 1))}</span>
          )}
        </span>
      </div>
      <Sparkline points={history} color={color} />
    </div>
  );
}

export default function AirportBandwidthCard({ routerName }: { routerName: string }) {
  const { data, isLoading } = useAirportWireless(routerName);
  const nav = useBandwidthNav();
  const cardId = `bw-${routerName}`;
  const historyRef = useRef<BandHistory>({});

  const online = data?.online ?? false;

  // Accumulate one sample per refetch
  useEffect(() => {
    if (!data?.online || !data.accessPoints.length) return;
    const now = Math.floor(Date.now() / 1000);
    for (const ap of data.accessPoints) {
      const key = ap.band;
      const totalKbps = ap.clients.reduce((s, c) => s + c.txrate_mbps * 1000, 0);
      const prev = historyRef.current[key] ?? [];
      // Avoid duplicate timestamps
      if (prev.length > 0 && prev[prev.length - 1].ts === now) return;
      historyRef.current[key] = [...prev, { ts: now, value: totalKbps }].slice(-MAX_HISTORY);
    }
  }, [data]);

  useEffect(() => {
    if (!nav) return;
    nav.register({ id: cardId, name: routerName, type: "airport", online });
    return () => nav.unregister(cardId);
  }, [nav, cardId, routerName, online]);

  return (
    <div id={cardId} className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-medium">
        <Wifi size={13} className="text-indigo-400" />
        {routerName} — Wi-Fi
      </div>

      {isLoading || !data ? (
        <div className="flex flex-col gap-3">
          <div className="h-16 bg-slate-700/30 rounded animate-pulse" />
          <div className="h-16 bg-slate-700/30 rounded animate-pulse" />
        </div>
      ) : !online ? (
        <p className="text-xs text-slate-500">Routeur hors ligne</p>
      ) : data.accessPoints.length === 0 ? (
        <p className="text-xs text-slate-500">Aucune interface Wi-Fi</p>
      ) : (
        <div className="flex flex-col gap-4">
          {data.accessPoints.map((ap) => (
            <ApRow
              key={ap.band}
              ap={ap}
              history={historyRef.current[ap.band] ?? []}
            />
          ))}
        </div>
      )}
    </div>
  );
}

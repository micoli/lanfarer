import { ArrowDown } from "lucide-react";
import { useEffect } from "react";
import { Sparkline } from "../../../../src/components/Sparkline.tsx";
import { useBandwidthNav } from "../../../../src/contexts/BandwidthNavContext.tsx";
import { useKuwfiBandwidth } from "../hooks/useKuwfi.ts";

function fmtKbps(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mb/s`;
  return `${kbps.toFixed(0)} Kb/s`;
}

export default function KuwfiBandwidthCard({ routerName }: { routerName: string }) {
  const { data, isLoading } = useKuwfiBandwidth(routerName);
  const nav = useBandwidthNav();
  const cardId = `bw-${routerName}`;
  const online = !!data && (data.band24.length > 0 || data.band5.length > 0);

  useEffect(() => {
    if (!nav) return;
    nav.register({ id: cardId, name: routerName, type: "kuwfi", online });
    return () => nav.unregister(cardId);
  }, [nav, cardId, routerName, online]);

  const last0 = data?.band24[data.band24.length - 1]?.down ?? 0;
  const last1 = data?.band5[data.band5.length - 1]?.down ?? 0;
  const max0 = data ? Math.max(...data.band24.map((p) => p.down), 1) : 1;
  const max1 = data ? Math.max(...data.band5.map((p) => p.down), 1) : 1;

  const noData = data && data.band24.length === 0 && data.band5.length === 0;

  return (
    <div id={cardId} className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-medium">
        <ArrowDown size={13} className="text-cyan-400" />
        {routerName} — Débit
      </div>
      {isLoading || !data ? (
        <div className="flex flex-col gap-3">
          <div className="h-16 bg-slate-700/30 rounded animate-pulse" />
          <div className="h-16 bg-slate-700/30 rounded animate-pulse" />
        </div>
      ) : noData ? (
        <p className="text-slate-500 text-sm">Aucune donnée disponible.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {data.band24.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span className="text-amber-400">wlan0</span>
                <span className="tabular-nums text-slate-300">
                  {fmtKbps(last0)} <span className="text-slate-500">/ max {fmtKbps(max0)}</span>
                </span>
              </div>
              <Sparkline points={data.band24.map((p) => ({ ts: p.ts, value: p.down }))} color="#f59e0b" />
            </div>
          )}
          {data.band5.length > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span className="text-cyan-400">wlan1</span>
                <span className="tabular-nums text-slate-300">
                  {fmtKbps(last1)} <span className="text-slate-500">/ max {fmtKbps(max1)}</span>
                </span>
              </div>
              <Sparkline points={data.band5.map((p) => ({ ts: p.ts, value: p.down }))} color="#22d3ee" />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

import { ArrowDown } from "lucide-react";
import { Sparkline } from "../../../../src/components/Sparkline.tsx";
import { useCudyBandwidth } from "../hooks/useCudy.ts";

function fmtKbps(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mb/s`;
  return `${kbps.toFixed(0)} Kb/s`;
}

export default function CudyBandwidthCard({ routerName }: { routerName: string }) {
  const { data, isLoading } = useCudyBandwidth(routerName);

  const lastRa0 = data?.ra0[data.ra0.length - 1]?.down ?? 0;
  const lastRai0 = data?.rai0[data.rai0.length - 1]?.down ?? 0;
  const maxRa0 = data ? Math.max(...data.ra0.map((p) => p.down), 1) : 1;
  const maxRai0 = data ? Math.max(...data.rai0.map((p) => p.down), 1) : 1;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-medium">
        <ArrowDown size={13} className="text-amber-400" />
        {routerName} — Wi-Fi
      </div>
      {isLoading || !data ? (
        <div className="flex flex-col gap-3">
          <div className="h-16 bg-slate-700/30 rounded animate-pulse" />
          <div className="h-16 bg-slate-700/30 rounded animate-pulse" />
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="text-amber-400">2.4 GHz (ra0)</span>
              <span className="tabular-nums text-slate-300">
                {fmtKbps(lastRa0)} <span className="text-slate-500">/ max {fmtKbps(maxRa0)}</span>
              </span>
            </div>
            <Sparkline points={data.ra0.map((p) => ({ ts: p.ts, value: p.down }))} color="#f59e0b" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="text-purple-400">5 GHz (rai0)</span>
              <span className="tabular-nums text-slate-300">
                {fmtKbps(lastRai0)} <span className="text-slate-500">/ max {fmtKbps(maxRai0)}</span>
              </span>
            </div>
            <Sparkline
              points={data.rai0.map((p) => ({ ts: p.ts, value: p.down }))}
              color="#a855f7"
            />
          </div>
        </div>
      )}
    </div>
  );
}

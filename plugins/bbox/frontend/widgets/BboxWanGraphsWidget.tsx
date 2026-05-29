import { ArrowDown, ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sparkline } from "../../../../src/components/Sparkline.tsx";
import { useWanGraphs } from "../hooks/useBbox.ts";

export default function BboxWanGraphsWidget({ routerId }: { routerId: string }) {
  const { t } = useTranslation();
  const { data: graphs } = useWanGraphs(routerId);

  const fmtKbps = (kbps: number) =>
    kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mb/s` : `${kbps.toFixed(0)} Kb/s`;

  const lastDown = graphs?.down[graphs.down.length - 1]?.value ?? 0;
  const lastUp = graphs?.up[graphs.up.length - 1]?.value ?? 0;
  const maxDown = graphs ? Math.max(...graphs.down.map((p) => p.value), 1) : 1;
  const maxUp = graphs ? Math.max(...graphs.up.map((p) => p.value), 1) : 1;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-3 col-span-2">
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-medium">
        <ArrowDown size={13} className="text-green-400" />
        <ArrowUp size={13} className="text-blue-400" />
        {t("home.wanGraphs", "Débit WAN — dernière heure")}
      </div>
      {graphs ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-green-400">
                <ArrowDown size={11} /> {t("home.downstream", "Downstream")}
              </span>
              <span className="tabular-nums text-slate-300">
                {fmtKbps(lastDown)} <span className="text-slate-500">/ max {fmtKbps(maxDown)}</span>
              </span>
            </div>
            <Sparkline points={graphs.down} color="#22c55e" />
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1 text-blue-400">
                <ArrowUp size={11} /> {t("home.upstream", "Upstream")}
              </span>
              <span className="tabular-nums text-slate-300">
                {fmtKbps(lastUp)} <span className="text-slate-500">/ max {fmtKbps(maxUp)}</span>
              </span>
            </div>
            <Sparkline points={graphs.up} color="#3b82f6" />
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="h-12 bg-slate-700/30 rounded animate-pulse" />
          <div className="h-12 bg-slate-700/30 rounded animate-pulse" />
        </div>
      )}
    </div>
  );
}

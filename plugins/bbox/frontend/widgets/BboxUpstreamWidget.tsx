import { ArrowUp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useWanStats } from "../hooks/useBbox.ts";
import { BandwidthBar, Skeleton, StatCard, formatBandwidth, formatBytes } from "./shared.tsx";

export default function BboxUpstreamWidget({ routerId }: { routerId: string }) {
  const { t } = useTranslation();
  const { data: stats } = useWanStats(routerId);
  return (
    <StatCard label={t("home.upstream")} icon={<ArrowUp size={13} className="text-blue-400" />}>
      {stats ? (
        <div className="flex flex-col gap-2">
          <p className="text-2xl font-semibold text-slate-100 tabular-nums">
            {formatBandwidth(stats.tx.bandwidth)}
          </p>
          <BandwidthBar
            value={stats.tx.bandwidth}
            max={stats.tx.contractualBandwidth / 1000}
            color="bg-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-500">
            <span>{t("home.used", { pct: stats.tx.occupation })}</span>
            <span>{t("home.max", { bw: formatBandwidth(stats.tx.contractualBandwidth / 1000) })}</span>
          </div>
          <p className="text-xs text-slate-500 pt-1 border-t border-slate-700">
            {t("home.totalSent")}{" "}
            <span className="text-slate-300">{formatBytes(stats.tx.bytes)}</span>
          </p>
        </div>
      ) : (
        <Skeleton />
      )}
    </StatCard>
  );
}

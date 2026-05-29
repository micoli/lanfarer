import { Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDevice } from "../hooks/useBbox.ts";
import { Skeleton, StatCard, formatUptime } from "./shared.tsx";

export default function BboxUptimeWidget({ routerId }: { routerId: string }) {
  const { t } = useTranslation();
  const { data: device } = useDevice(routerId);
  return (
    <StatCard label={t("home.uptime")} icon={<Clock size={13} />}>
      {device ? (
        <p className="text-2xl font-semibold text-slate-100 tabular-nums">
          {formatUptime(device.uptime)}
        </p>
      ) : (
        <Skeleton />
      )}
      {device && (
        <p className="text-xs text-slate-500">{t("home.boots", { count: device.boots })}</p>
      )}
    </StatCard>
  );
}

import { Cpu } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDevice } from "../hooks/useBbox.ts";
import { Skeleton, StatCard } from "./shared.tsx";

export default function BboxFirmwareWidget({ routerId }: { routerId: string }) {
  const { t, i18n } = useTranslation();
  const { data: device } = useDevice(routerId);
  return (
    <StatCard label={t("home.system")} icon={<Cpu size={13} />}>
      {device ? (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-slate-200">
            {t("home.firmware")} {device.firmware}
          </p>
          <p className="text-xs text-slate-500">
            {new Date(device.firmwareDate).toLocaleDateString(
              i18n.language === "fr" ? "fr-FR" : "en-GB",
              { day: "numeric", month: "long", year: "numeric" },
            )}
          </p>
        </div>
      ) : (
        <Skeleton />
      )}
    </StatCard>
  );
}

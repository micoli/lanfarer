import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw, Router } from "lucide-react";
import { useTranslation } from "react-i18next";
import { HotspotNavProvider } from "../contexts/HotspotNavContext.tsx";
import { useActivePlugins } from "../hooks/useActivePlugins.ts";
import { useRouters } from "../hooks/useUiConfig.ts";

export default function HotspotsPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const activePlugins = useActivePlugins();
  const allRouters = useRouters() ?? [];

  const sections = activePlugins.filter((p) => p.hotspotSection != null);

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Router size={20} className="text-blue-400 shrink-0" />
        <h1 className="text-lg font-semibold text-slate-100 flex-1">{t("cudy.title")}</h1>
        <button
          type="button"
          onClick={() => void qc.invalidateQueries()}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors px-2 py-1 rounded-md hover:bg-slate-800"
        >
          <RefreshCw size={13} />
          {t("common.refresh")}
        </button>
      </div>

      <HotspotNavProvider>
        {sections.map((plugin) => {
          const Section = plugin.hotspotSection!;
          const routers = allRouters.filter((r) => r.type === plugin.type);
          return <Section key={plugin.type} routers={routers} />;
        })}

        {sections.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-8">{t("cudy.notConfigured")}</p>
        )}
      </HotspotNavProvider>
    </div>
  );
}

import { useQueryClient } from "@tanstack/react-query";
import { RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useActivePlugins } from "../hooks/useActivePlugins.ts";
import { useUiConfig } from "../hooks/useUiConfig.ts";

export default function Home() {
  const { t } = useTranslation();
  const uiConfig = useUiConfig();
  const activePlugins = useActivePlugins();
  const qc = useQueryClient();

  const widgetRegistry = new Map(
    activePlugins.flatMap((p) => (p.widgets ?? []).map((w) => [w.type, w.component])),
  );

  const widgets = uiConfig.home?.widgets ?? [];

  return (
    <div className="p-6 flex flex-col gap-6 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-100">{t("nav.home")}</h1>
        <button
          type="button"
          onClick={() => void qc.invalidateQueries()}
          className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          title={t("common.refresh")}
        >
          <RefreshCw size={14} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {widgets.map((w, i) => {
          const Widget = widgetRegistry.get(w.type);
          if (!Widget) return null;
          return <Widget key={`${w.type}-${w.id}-${i}`} routerId={w.id} />;
        })}
      </div>
    </div>
  );
}

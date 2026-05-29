import { useTranslation } from "react-i18next";
import { BandwidthNavProvider } from "../contexts/BandwidthNavContext.tsx";
import { frontendPlugins } from "../../plugins/frontendPlugins.ts";
import { useRouters } from "../hooks/useUiConfig.ts";

export default function Bandwidth() {
  const { t } = useTranslation();
  const routers = useRouters();

  const bandwidthRouters = [...(routers ?? [])]
    .filter((r) => frontendPlugins.find((p) => p.type === r.type)?.bandwidthCard)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="p-6 flex flex-col gap-6 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-100">
          {t("nav.bandwidth", "Bande passante")}
        </h1>
      </div>

      {routers === undefined && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 h-48 animate-pulse"
            />
          ))}
        </div>
      )}

      {routers?.length === 0 && (
        <p className="text-slate-500 text-sm">Aucun routeur configuré dans config.yaml.</p>
      )}

      {routers && bandwidthRouters.length > 0 && (
        <BandwidthNavProvider>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {bandwidthRouters.map((r) => {
              const plugin = frontendPlugins.find((p) => p.type === r.type);
              const Card = plugin?.bandwidthCard;
              if (!Card) return null;
              return <Card key={r.name} routerName={r.name} />;
            })}
          </div>
        </BandwidthNavProvider>
      )}
    </div>
  );
}

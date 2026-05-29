import { Wifi } from "lucide-react";
import type { AccessPoint } from "../../../contracts.ts";
import { useCudyClients } from "../hooks/useCudy.ts";

function CudyAccessPointCard({ ap }: { ap: AccessPoint }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi size={16} className="text-green-400" />
          <span className="font-semibold text-slate-100">{ap.band}</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
          active
        </span>
      </div>
      <div className="flex flex-col gap-2 text-xs">
        <div className="flex justify-between">
          <span className="text-slate-500">SSID</span>
          <span className="font-mono text-slate-200">{ap.ssid}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Canal</span>
          <span className="text-slate-200">{ap.channel}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-500">Clients</span>
          <span className="text-slate-200">{ap.clients.length}</span>
        </div>
      </div>
    </div>
  );
}

export default function CudyWifiSection() {
  const { data: cudyData } = useCudyClients();
  const routers = cudyData?.routers ?? [];

  if (routers.length === 0) return null;

  return (
    <>
      {routers.map((router) => (
        <div key={router.name} className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-200">{router.name}</h2>
            <span className="text-xs text-slate-500">{router.ip}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${router.wireless.online ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-500"}`}
            >
              {router.wireless.online ? "en ligne" : "hors ligne"}
            </span>
          </div>
          {router.wireless.online && router.wireless.accessPoints.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {router.wireless.accessPoints.map((ap, i) => (
                <CudyAccessPointCard key={`${ap.ssid}-${i}`} ap={ap} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              {router.wireless.online ? "Aucune interface Wi-Fi détectée" : "Routeur injoignable"}
            </p>
          )}
        </div>
      ))}
    </>
  );
}

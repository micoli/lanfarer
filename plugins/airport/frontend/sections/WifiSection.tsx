import { Wifi } from "lucide-react";
import { useRouters } from "../../../../src/hooks/useUiConfig.ts";
import type { AirportAccessPoint, AirportWirelessData } from "../hooks/useAirport.ts";
import { useAirportWireless } from "../hooks/useAirport.ts";

function AccessPointRow({ ap }: { ap: AirportAccessPoint }) {
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi size={16} className="text-green-400" />
          <span className="font-semibold text-slate-100">{ap.band}</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">active</span>
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

function AirportRouterRow({ routerId, routerName }: { routerId: string; routerName: string }) {
  const { data: wireless } = useAirportWireless(routerId) as { data: AirportWirelessData | undefined };
  const online = wireless?.online ?? false;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-200">{routerName}</h2>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${online ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-500"}`}
        >
          {online ? "en ligne" : "hors ligne"}
        </span>
      </div>
      {online && (wireless?.accessPoints.length ?? 0) > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {wireless?.accessPoints.map((ap, i) => (
            <AccessPointRow key={`${ap.ssid}-${ap.band}-${i}`} ap={ap} />
          ))}
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          {online ? "Aucune interface Wi-Fi détectée" : "Routeur injoignable"}
        </p>
      )}
    </div>
  );
}

export default function AirportWifiSection() {
  const allRouters = useRouters();
  const airportRouters = allRouters?.filter((r) => r.type === "airport") ?? [];

  if (airportRouters.length === 0) return null;

  return (
    <>
      {airportRouters.map((r) => (
        <AirportRouterRow key={r.name} routerId={r.name} routerName={r.name} />
      ))}
    </>
  );
}

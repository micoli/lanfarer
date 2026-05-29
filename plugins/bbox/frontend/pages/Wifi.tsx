import { Eye, EyeOff, Shield, Wifi, WifiOff } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useBBoxWifiSettings } from "../hooks/useBbox";
import { type CudyRouterWireless, useCudyClients } from "../../../cudy/frontend/hooks/useCudy.ts";
import { useAirportDeviceInfo, useAirportHosts } from "../../../airport/frontend/hooks/useAirport.ts";
import type { AccessPoint, Host } from "../../../contracts.ts";

interface RadioBand {
  enable: number;
  standard: string;
  state: number;
  channel: number;
  current_channel: number;
  current_bandwidth: number;
  dfs?: number;
}

interface SsidSecurity {
  protocol: string;
  encryption: string;
  passphrase: string;
  isdefault: number;
}

interface Ssid {
  id: string;
  enable: number;
  hidden: number;
  bssid: string;
  security: SsidSecurity;
  wps?: { enable: number; available: number };
}

interface WirelessData {
  status: string;
  radio: { "24": RadioBand; "5": RadioBand; guest?: { enable: number } };
  ssid: { "24": Ssid; "5": Ssid; guest?: Ssid; compatibility?: Ssid };
  standard: { "24": { key: string; value: string }[]; "5": { key: string; value: string }[] };
  scheduler: { enable: number };
}

function parseWireless(raw: unknown): WirelessData | null {
  return (raw as { wireless?: WirelessData }[])?.[0]?.wireless ?? null;
}

function standardLabel(key: string, standards: { key: string; value: string }[]): string {
  return standards.find((s) => s.key === key)?.value ?? key;
}

function PassphraseField({ passphrase }: { passphrase: string }) {
  const { t } = useTranslation();
  const [show, setShow] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <span
        className={`font-mono text-sm ${show ? "text-slate-200" : "text-slate-400 tracking-widest"}`}
      >
        {show ? passphrase : "•".repeat(Math.min(passphrase.length, 12))}
      </span>
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        className="text-slate-500 hover:text-slate-300 transition-colors"
        title={show ? t("wifi.hide") : t("wifi.show")}
      >
        {show ? <EyeOff size={13} /> : <Eye size={13} />}
      </button>
    </div>
  );
}

function BandCard({
  band,
  radio,
  ssid,
  standards,
}: {
  band: "2.4 GHz" | "5 GHz";
  radio: RadioBand;
  ssid: Ssid;
  standards: { key: string; value: string }[];
}) {
  const { t } = useTranslation();
  const enabled = radio.enable === 1 && ssid.enable === 1;

  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
      {/* Band header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {enabled ? (
            <Wifi size={16} className="text-green-400" />
          ) : (
            <WifiOff size={16} className="text-slate-500" />
          )}
          <span className="font-semibold text-slate-100">{band}</span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${enabled ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-500"}`}
        >
          {enabled ? t("wifi.active") : t("wifi.inactive")}
        </span>
      </div>

      {/* SSID */}
      <div className="flex flex-col gap-2">
        <Row label="SSID" value={ssid.id} mono />
        <Row label="BSSID" value={ssid.bssid} mono dimmed />
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-500">{t("wifi.password")}</span>
          <PassphraseField passphrase={ssid.security.passphrase} />
        </div>
      </div>

      <hr className="border-slate-700" />

      {/* Radio */}
      <div className="flex flex-col gap-2">
        <Row label="Standard" value={standardLabel(radio.standard, standards)} />
        <Row label={t("wifi.currentChannel")} value={`${radio.current_channel} (auto)`} />
        <Row label={t("wifi.bandwidth")} value={`${radio.current_bandwidth} MHz`} />
        {radio.dfs !== undefined && (
          <Row label="DFS" value={radio.dfs ? t("wifi.enabled") : t("wifi.disabled")} />
        )}
      </div>

      <hr className="border-slate-700" />

      {/* Security */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-400">
          <Shield size={12} />
          <span>
            {ssid.security.protocol} / {ssid.security.encryption}
          </span>
        </div>
        {ssid.wps && (
          <Row label="WPS" value={ssid.wps.enable ? t("wifi.enabled") : t("wifi.disabled")} />
        )}
        {ssid.hidden === 1 && (
          <span className="text-xs text-amber-400">{t("wifi.hiddenNetwork")}</span>
        )}
      </div>
    </div>
  );
}

function GuestCard({ ssid }: { ssid: Ssid }) {
  const { t } = useTranslation();
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi size={16} className={ssid.enable ? "text-green-400" : "text-slate-500"} />
          <span className="font-semibold text-slate-100">{t("wifi.guestNetwork")}</span>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${ssid.enable ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-500"}`}
        >
          {ssid.enable ? t("wifi.active") : t("wifi.inactive")}
        </span>
      </div>
      {ssid.enable ? (
        <>
          <Row label="SSID" value={ssid.id} mono />
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">{t("wifi.password")}</span>
            <PassphraseField passphrase={ssid.security.passphrase} />
          </div>
          <Row
            label={t("wifi.security")}
            value={`${ssid.security.protocol} / ${ssid.security.encryption}`}
          />
        </>
      ) : (
        <p className="text-xs text-slate-500">{t("wifi.guestDisabled")}</p>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
  dimmed = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  dimmed?: boolean;
}) {
  return (
    <div className="flex justify-between items-center text-xs">
      <span className="text-slate-500">{label}</span>
      <span
        className={`${mono ? "font-mono" : ""} ${dimmed ? "text-slate-500" : "text-slate-200"}`}
      >
        {value}
      </span>
    </div>
  );
}

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
      <div className="flex flex-col gap-2">
        <Row label="SSID" value={ap.ssid} mono />
        <Row label="Canal" value={String(ap.channel)} />
        <Row label="Clients" value={String(ap.clients.length)} />
      </div>
    </div>
  );
}


function AirportClientRow({ host }: { host: Host }) {
  return (
    <div className="flex items-center justify-between text-xs py-1.5 border-b border-slate-700/50 last:border-0">
      <div className="flex flex-col gap-0.5">
        <span className="font-mono text-slate-300">{host.hostname || host.mac}</span>
        {host.hostname && <span className="font-mono text-slate-500 text-[11px]">{host.mac}</span>}
      </div>
      <span className="text-slate-400 font-mono">{host.ip}</span>
    </div>
  );
}

function AirportSection({ routerId }: { routerId: string }) {
  const { data, isLoading } = useAirportHosts(routerId);
  const { data: deviceInfo } = useAirportDeviceInfo(routerId);
  const hosts = data?.hosts ?? [];
  const online = data?.online ?? false;
  const hasDeviceInfo = deviceInfo && (deviceInfo.laMA || deviceInfo.waMA);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-slate-200">AirPort Extreme</h2>

      <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {online ? (
              <Wifi size={16} className="text-green-400" />
            ) : (
              <WifiOff size={16} className="text-slate-500" />
            )}
            <span className="text-sm font-medium text-slate-200">AirPort Extreme</span>
          </div>
          {!isLoading && (
            <span
              className={`text-xs px-2 py-0.5 rounded-full ${online ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-500"}`}
            >
              {online ? "en ligne" : "hors ligne"}
            </span>
          )}
        </div>

        {hasDeviceInfo && (
          <div className="flex flex-col gap-2">
            {deviceInfo.waMA && <Row label="MAC Wi-Fi" value={deviceInfo.waMA} mono dimmed />}
            {deviceInfo.laMA && deviceInfo.laMA !== deviceInfo.waMA && (
              <Row label="MAC LAN" value={deviceInfo.laMA} mono dimmed />
            )}
            {deviceInfo.raMA && deviceInfo.raMA !== deviceInfo.waMA && (
              <Row label="MAC radio" value={deviceInfo.raMA} mono dimmed />
            )}
          </div>
        )}

        <hr className="border-slate-700" />

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-slate-300">Appareils connectés</span>
            {!isLoading && (
              <span className="text-xs text-slate-500 ml-auto">
                {hosts.length} appareil{hosts.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
          {isLoading ? (
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          ) : hosts.length === 0 ? (
            <p className="text-xs text-slate-500">Aucun appareil détecté dans la table ARP</p>
          ) : (
            hosts.map((h) => <AirportClientRow key={h.mac} host={h} />)
          )}
        </div>
      </div>
    </div>
  );
}

function CudyRouterSection({ router }: { router: CudyRouterWireless }) {
  const online = router.wireless.online;
  const aps = router.wireless.accessPoints;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-200">{router.name}</h2>
        <span className="text-xs text-slate-500">{router.ip}</span>
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${online ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-500"}`}
        >
          {online ? "en ligne" : "hors ligne"}
        </span>
      </div>
      {online && aps.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {aps.map((ap, i) => (
            <CudyAccessPointCard key={`${ap.ssid}-${i}`} ap={ap} />
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

export default function WifiPage() {
  const { t } = useTranslation();

  const { data: raw, isLoading, error } = useBBoxWifiSettings(
    "bbox-main",
  );
  const { data: cudyData } = useCudyClients();
  const w = parseWireless(raw);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1 h-full">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error && !w) {
    return (
      <div className="p-6">
        <p className="text-red-400 text-sm">
          {error instanceof Error ? error.message : t("wifi.error")}
        </p>
      </div>
    );
  }

  const cudyRouters = cudyData?.routers ?? [];

  return (
    <div className="p-6 flex flex-col gap-6 overflow-auto">
      <h1 className="text-lg font-semibold text-slate-100">{t("wifi.title")}</h1>

      {/* Bbox section */}
      {w && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-200">Bbox</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <BandCard
              band="2.4 GHz"
              radio={w.radio["24"]}
              ssid={w.ssid["24"]}
              standards={w.standard["24"]}
            />
            <BandCard
              band="5 GHz"
              radio={w.radio["5"]}
              ssid={w.ssid["5"]}
              standards={w.standard["5"]}
            />
          </div>
          {w.ssid.guest && <GuestCard ssid={w.ssid.guest} />}
        </div>
      )}

      {/* Cudy routers sections */}
      {cudyRouters.map((router) => (
        <CudyRouterSection key={router.name} router={router} />
      ))}
    </div>
  );
}

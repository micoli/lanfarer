import { Eye, EyeOff, Wifi } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { AccessPoint } from "../../../contracts.ts";
import { useCudyClients } from "../hooks/useCudy.ts";

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
      <span className={`${mono ? "font-mono" : ""} ${dimmed ? "text-slate-500" : "text-slate-200"}`}>
        {value}
      </span>
    </div>
  );
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

function CudyAccessPointCard({ ap }: { ap: AccessPoint }) {
  const { t } = useTranslation();
  return (
    <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wifi size={16} className="text-green-400" />
          <span className="font-semibold text-slate-100">{ap.band}</span>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full bg-green-500/10 text-green-400">
          {t("wifi.active")}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        <Row label="SSID" value={ap.ssid} mono />
        {ap.bssid && <Row label="BSSID" value={ap.bssid} mono dimmed />}
        {ap.password && (
          <div className="flex justify-between items-center text-xs">
            <span className="text-slate-500">{t("wifi.password")}</span>
            <PassphraseField passphrase={ap.password} />
          </div>
        )}
      </div>

      {(ap.standard || ap.channel || ap.width) && (
        <>
          <hr className="border-slate-700" />
          <div className="flex flex-col gap-2">
            {ap.standard && <Row label="Standard" value={ap.standard} />}
            {ap.channel > 0 && <Row label={t("wifi.currentChannel")} value={String(ap.channel)} />}
            {ap.width && <Row label={t("wifi.bandwidth")} value={`${ap.width} MHz`} />}
          </div>
        </>
      )}

      <hr className="border-slate-700" />
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-500">Clients</span>
        <span className="text-slate-200">{ap.clients.length}</span>
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

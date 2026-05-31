import { Loader2, Terminal, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { usePing } from "../hooks/usePing.ts";
import { type ProbeResult, serverApi } from "../lib/api/server.ts";

const PORT_NAMES: Record<number, string> = {
  21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP",
  80: "HTTP", 443: "HTTPS", 445: "SMB", 3389: "RDP",
  5900: "VNC", 8080: "HTTP-alt", 8443: "HTTPS-alt",
};

const HTTP_PORTS: Record<number, "http" | "https"> = {
  80: "http", 8080: "http", 443: "https", 8443: "https",
};

function Sparkline({ history }: { history: (number | null)[] }) {
  const vals = history.filter((v): v is number => v !== null);
  if (vals.length < 2) return null;
  const max = Math.max(...vals);
  const W = 120;
  const H = 24;
  const step = W / (history.length - 1);
  const points = history
    .map((v, i) => (v !== null ? `${i * step},${H - (v / max) * (H - 2) - 1}` : null))
    .filter(Boolean)
    .join(" ");
  return (
    <svg width={W} height={H} className="opacity-70" aria-hidden="true">
      <polyline points={points} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

export function HostToolPopup({ ip, onClose }: { ip: string; onClose: () => void }) {
  const { t } = useTranslation();
  const pingStates = usePing([ip]);
  const ping = pingStates.get(ip);
  const [probeResult, setProbeResult] = useState<ProbeResult | null>(null);
  const [probing, setProbing] = useState(false);
  const [probeError, setProbeError] = useState<string | null>(null);

  const runProbe = useCallback(async () => {
    setProbing(true);
    setProbeError(null);
    setProbeResult(null);
    try {
      const result = await serverApi.probeHost(ip);
      setProbeResult(result);
    } catch {
      setProbeError(t("common.error"));
    } finally {
      setProbing(false);
    }
  }, [ip, t]);

  useEffect(() => { void runProbe(); }, [runProbe]);

  return (
    <>
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 z-50 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="fixed right-4 top-1/2 -translate-y-1/2 w-72 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden z-50"
      >
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
          <Terminal size={14} className="text-blue-400 shrink-0" />
          <span className="font-mono text-sm text-slate-100 flex-1">{ip}</span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-slate-500 hover:text-slate-200 transition-colors"
          >
            <X size={14} />
          </button>
        </div>

        <div className="flex flex-col gap-0 overflow-y-auto">
          {/* Ping live */}
          <div className="px-4 py-3 border-b border-slate-800">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              {t("probe.ping")}
            </div>
            {!ping ? (
              <span className="text-xs text-slate-500">{t("common.loading")}</span>
            ) : (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block w-2 h-2 rounded-full shrink-0 ${ping.rtt !== null ? "bg-green-400" : "bg-red-400"}`}
                  />
                  <span className="font-mono text-xs text-slate-200">
                    {ping.rtt !== null ? `${ping.rtt} ms` : t("probe.timeout")}
                  </span>
                  {ping.loss > 0 && (
                    <span className="text-xs text-orange-400 ml-auto">{ping.loss}% loss</span>
                  )}
                </div>
                {ping.history.length > 1 && <Sparkline history={ping.history} />}
                {ping.min !== null && (
                  <div className="font-mono text-xs text-slate-500">
                    min {ping.min} / avg {ping.avg} / max {ping.max} ms
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Probe section */}
          <div className="px-4 py-3">
            <div className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-2">
              {t("probe.scan")}
            </div>

            {probing && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={13} className="animate-spin" />
                {t("probe.scanning")}
              </div>
            )}

            {probeError && (
              <span className="text-xs text-red-400">{probeError}</span>
            )}

            {probeResult && (
              <div className="flex flex-col gap-2">
                {probeResult.pingStats && (
                  <div className="font-mono text-xs text-slate-400">
                    min {probeResult.pingStats.min.toFixed(1)} / avg {probeResult.pingStats.avg.toFixed(1)} / max {probeResult.pingStats.max.toFixed(1)} ms
                  </div>
                )}

                <div>
                  <div className="text-xs text-slate-500 mb-1">{t("probe.ports")}</div>
                  {probeResult.openPorts.length === 0 ? (
                    <span className="text-xs text-slate-600">{t("probe.noPorts")}</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {probeResult.openPorts.map((p) => {
                        const label = `${p}${PORT_NAMES[p] ? ` ${PORT_NAMES[p]}` : ""}`;
                        const scheme = HTTP_PORTS[p];
                        if (scheme) {
                          const port = (scheme === "http" && p === 80) || (scheme === "https" && p === 443) ? "" : `:${p}`;
                          return (
                            <a
                              key={p}
                              href={`${scheme}://${ip}${port}`}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block px-1.5 py-0.5 bg-blue-900/40 text-blue-300 text-xs font-mono rounded hover:bg-blue-800/50 transition-colors"
                              title={`Ouvrir ${scheme}://${ip}${port}`}
                            >
                              {label}
                            </a>
                          );
                        }
                        return (
                          <span
                            key={p}
                            className="inline-block px-1.5 py-0.5 bg-slate-700 text-slate-300 text-xs font-mono rounded"
                            title={PORT_NAMES[p]}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>

                {probeResult.mdnsName && (
                  <div className="text-xs">
                    <span className="text-slate-500">{t("probe.mdns")} </span>
                    <span className="font-mono text-slate-300">{probeResult.mdnsName}</span>
                  </div>
                )}

                {probeResult.smbName && (
                  <div className="text-xs">
                    <span className="text-slate-500">{t("probe.smb")} </span>
                    <span className="font-mono text-slate-300">
                      {probeResult.smbName}
                      {probeResult.smbDomain ? ` (${probeResult.smbDomain})` : ""}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => void runProbe()}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors mt-1 text-left"
                >
                  ↺ {t("common.refresh")}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

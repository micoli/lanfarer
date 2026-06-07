import { Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { type HaHistoryData, serverApi } from "../lib/api/server.ts";

const DAYS_OPTIONS = [1, 3, 7, 31] as const;

interface TimelineSegment {
  startPct: number;
  widthPct: number;
  state: string;
  segStartTs: number;
  segEndTs: number;
}

function buildSegments(
  history: HaHistoryData["history"],
  startTs: number,
  endTs: number
): TimelineSegment[] {
  const span = endTs - startTs;
  if (span <= 0 || history.length === 0) return [];
  const segments: TimelineSegment[] = [];
  for (let i = 0; i < history.length; i++) {
    const entry = history[i];
    const segStart = Math.max(entry.ts, startTs);
    const segEnd = i + 1 < history.length ? Math.min(history[i + 1].ts, endTs) : endTs;
    if (segEnd <= segStart) continue;
    segments.push({
      startPct: ((segStart - startTs) / span) * 100,
      widthPct: ((segEnd - segStart) / span) * 100,
      state: entry.state,
      segStartTs: segStart,
      segEndTs: segEnd,
    });
  }
  return segments;
}

function stateColor(state: string): string {
  if (state === "home") return "bg-green-500";
  if (state === "not_home") return "bg-slate-700";
  return "bg-slate-600";
}

function DayMarkers({ days, startTs, endTs }: { days: number; startTs: number; endTs: number }) {
  const span = endTs - startTs;
  const markers: { pct: number; label: string }[] = [];
  const msPerDay = 86400;
  const step = days > 14 ? 7 : 1;
  const dayStart = Math.ceil(startTs / msPerDay) * msPerDay;
  for (let ts = dayStart; ts < endTs; ts += msPerDay * step) {
    const pct = ((ts - startTs) / span) * 100;
    const d = new Date(ts * 1000);
    const label =
      days <= 3
        ? d.toLocaleDateString(undefined, { weekday: "short" })
        : d.toLocaleDateString(undefined, { month: "numeric", day: "numeric" });
    markers.push({ pct, label });
  }
  return (
    <div className="relative h-4 mt-0.5">
      {markers.map((m) => (
        <span
          key={m.pct}
          className="absolute text-[9px] text-slate-500 -translate-x-1/2"
          style={{ left: `${m.pct}%` }}
        >
          {m.label}
        </span>
      ))}
    </div>
  );
}

export function HaTimeline({
  mac,
  days,
  showMarkers = true,
  showNoEntity = true,
}: {
  mac: string;
  days: number;
  showMarkers?: boolean;
  showNoEntity?: boolean;
}) {
  const { t } = useTranslation();
  const [data, setData] = useState<HaHistoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredSeg, setHoveredSeg] = useState<TimelineSegment | null>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    serverApi
      .haHistory(mac, days)
      .then(setData)
      .catch(() => setError(t("common.error")))
      .finally(() => setLoading(false));
  }, [mac, days, t]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Loader2 size={12} className="animate-spin" />
        {t("common.loading")}
      </div>
    );
  }
  if (error) return <span className="text-xs text-red-400">{error}</span>;
  if (!data) return null;
  if (!data.entityId) {
    if (!showNoEntity) return null;
    return <span className="text-xs text-slate-500">{t("history.noEntity")}</span>;
  }

  const nowTs = Math.floor(Date.now() / 1000);
  const startTs = nowTs - days * 86400;
  const segments = buildSegments(data.history, startTs, nowTs);
  const homeSeconds = data.history.reduce((acc, entry, i) => {
    if (entry.state !== "home") return acc;
    const segEnd = i + 1 < data.history.length ? data.history[i + 1].ts : nowTs;
    return acc + Math.max(0, Math.min(segEnd, nowTs) - Math.max(entry.ts, startTs));
  }, 0);
  const homeHours = Math.round(homeSeconds / 3600);

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between mb-0.5">
        <span
          className="font-mono text-[10px] text-slate-500 truncate max-w-[160px]"
          title={data.entityId}
        >
          {data.entityId.replace(/^device_tracker\./, "")}
        </span>
        <span className="text-[10px] text-green-400 shrink-0">
          {homeHours}h {t("history.home")}
        </span>
      </div>
      {hoveredSeg &&
        barRef.current &&
        createPortal(
          (() => {
            const rect = barRef.current?.getBoundingClientRect();
            if (!rect) return null;
            const centerPct = hoveredSeg.startPct + hoveredSeg.widthPct / 2;
            const x = rect.left + (rect.width * centerPct) / 100;
            const y = rect.top - 4;
            const transform =
              centerPct < 15
                ? "translateX(0)"
                : centerPct > 85
                  ? "translateX(-100%)"
                  : "translateX(-50%)";
            return (
              <div
                className="fixed pointer-events-none z-[9999]"
                style={{ left: x, top: y, transform: `${transform} translateY(-100%)` }}
              >
                <span className="bg-slate-700 text-slate-200 text-[10px] px-2 py-0.5 rounded whitespace-nowrap shadow-lg border border-slate-600">
                  {new Date(hoveredSeg.segStartTs * 1000).toLocaleString()} →{" "}
                  {new Date(hoveredSeg.segEndTs * 1000).toLocaleString()}
                </span>
              </div>
            );
          })(),
          document.body
        )}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: timeline bar needs mouse events */}
      <div className="relative" onMouseLeave={() => setHoveredSeg(null)}>
        <div ref={barRef} className="relative h-5 bg-slate-800 rounded overflow-hidden">
          {segments.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center text-[10px] text-slate-600">
              {t("history.noData")}
            </div>
          ) : (
            segments.map((seg) => (
              // biome-ignore lint/a11y/noStaticElementInteractions: segment hover
              <div
                key={seg.startPct}
                className={`absolute top-0 h-full ${stateColor(seg.state)}`}
                style={{ left: `${seg.startPct}%`, width: `${seg.widthPct}%` }}
                onMouseEnter={() => setHoveredSeg(seg)}
              />
            ))
          )}
        </div>
      </div>
      {showMarkers && <DayMarkers days={days} startTs={startTs} endTs={nowTs} />}
    </div>
  );
}

export { DAYS_OPTIONS };

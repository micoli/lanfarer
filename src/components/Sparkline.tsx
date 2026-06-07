interface SparkPoint {
  ts: number;
  value: number;
}

function fmtKbps(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mb/s`;
  return `${kbps.toFixed(0)} Kb/s`;
}

function fmtTime(ts: number): string {
  const d = new Date(ts * 1000);
  return [d.getHours(), d.getMinutes(), d.getSeconds()]
    .map((n) => n.toString().padStart(2, "0"))
    .join(":");
}

export function Sparkline({ points, color }: { points: SparkPoint[]; color: string }) {
  if (points.length < 2) return <div className="h-12 bg-slate-700/30 rounded animate-pulse" />;

  const W = 300;
  const AXIS_H = 14;
  const H = 52;
  const padX = 2;
  const padY = 2;
  const PAD_LEFT = 36;
  const max = Math.max(...points.map((p) => p.value), 1);
  const minTs = points[0].ts;
  const maxTs = points[points.length - 1].ts;
  const rangeTs = maxTs - minTs || 1;

  const xS = (ts: number) => PAD_LEFT + padX + ((ts - minTs) / rangeTs) * (W - PAD_LEFT - padX * 2);
  const yS = (v: number) => padY + (1 - v / max) * (H - padY * 2);

  const fillPts = [
    ...points.map((p) => `${xS(p.ts).toFixed(1)},${yS(p.value).toFixed(1)}`),
    `${xS(maxTs).toFixed(1)},${H}`,
    `${xS(minTs).toFixed(1)},${H}`,
  ].join(" ");

  const xTicks = Array.from({ length: 5 }, (_, i) => minTs + Math.round((i / 4) * (maxTs - minTs)));
  const yTicks = [0, max * 0.5, max];

  return (
    <svg
      viewBox={`0 0 ${W} ${H + AXIS_H}`}
      className="w-full"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {yTicks.map((v) => (
        <g key={v}>
          <line
            x1={PAD_LEFT}
            x2={W}
            y1={yS(v).toFixed(1)}
            y2={yS(v).toFixed(1)}
            stroke="#334155"
            strokeWidth="0.5"
          />
          <text x={PAD_LEFT - 3} y={yS(v) + 2.5} textAnchor="end" fontSize="6.5" fill="#475569">
            {fmtKbps(v)}
          </text>
        </g>
      ))}
      <polygon points={fillPts} opacity="0.15" fill={color} />
      <polyline
        points={points.map((p) => `${xS(p.ts).toFixed(1)},${yS(p.value).toFixed(1)}`).join(" ")}
        fill="none"
        stroke={color}
        strokeWidth="0.8"
        strokeLinejoin="round"
      />
      {xTicks.map((ts) => (
        <text
          key={ts}
          x={xS(ts).toFixed(1)}
          y={H + AXIS_H - 1}
          textAnchor="middle"
          fontSize="7"
          fill="#64748b"
        >
          {fmtTime(ts)}
        </text>
      ))}
    </svg>
  );
}

export function StatCard({
  label,
  icon,
  children,
  colSpan2 = false,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  colSpan2?: boolean;
}) {
  return (
    <div
      className={`bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-3 ${colSpan2 ? "col-span-2" : ""}`}
    >
      <div className="flex items-center gap-2 text-slate-400 text-xs uppercase tracking-wider font-medium">
        {icon}
        {label}
      </div>
      {children}
    </div>
  );
}

export function Skeleton() {
  return <div className="h-8 bg-slate-700/50 rounded animate-pulse w-2/3" />;
}

export function BandwidthBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function formatBytes(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)} To`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)} Go`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} Mo`;
  return `${(n / 1e3).toFixed(0)} Ko`;
}

export function formatBandwidth(kbps: number): string {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mb/s`;
  return `${kbps} Kb/s`;
}

export function formatUptime(secs: number): string {
  const d = Math.floor(secs / 86400);
  const h = Math.floor((secs % 86400) / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (d > 0) return `${d}j ${h}h ${m}m`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

import { useState, useMemo } from "react";
import { Wifi, WifiOff, RefreshCw, ChevronUp, ChevronDown, ChevronsUpDown, BookmarkPlus, Bookmark, Check, X, AlertTriangle } from "lucide-react";
import { useHosts, useCreateDhcpClient, useDhcpClients, useIpCheck } from "../hooks/useBbox";
import { useQueryClient } from "@tanstack/react-query";
import type { DhcpClient } from "../lib/bbox/types";

interface Host {
  id?: number;
  hostname?: string;
  macaddress?: string;
  ipaddress?: string;
  type?: string;
  active?: number;
  firstseen?: number;
  lastseen?: number;
  link?: { intf?: string; speed?: number };
  [k: string]: unknown;
}

type SortKey = "hostname" | "ipaddress" | "lastseen" | "active";
type SortDir = "asc" | "desc";

function parseHosts(raw: unknown): Host[] | null {
  if (!raw) return null;
  if (Array.isArray(raw) && raw[0]?.hosts?.list) return raw[0].hosts.list as Host[];
  if (Array.isArray(raw) && raw[0]?.hosts && Array.isArray(raw[0].hosts))
    return raw[0].hosts as Host[];
  if (Array.isArray(raw) && raw.length > 0 && typeof raw[0] === "object") return raw as Host[];
  return null;
}

function Badge({ active }: { active?: number }) {
  return active ? (
    <span className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
      <Wifi size={11} /> Connecté
    </span>
  ) : (
    <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-700/50 px-2 py-0.5 rounded-full">
      <WifiOff size={11} /> Inactif
    </span>
  );
}

function relativeTime(ts?: number): string {
  if (!ts) return "—";
  const diff = Math.floor(Date.now() / 1000 - ts);
  if (diff < 60) return "à l'instant";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  return `${Math.floor(diff / 86400)} j`;
}

function ipToNum(ip?: string): number {
  if (!ip) return 0;
  return ip.split(".").reduce((acc, b) => acc * 256 + Number(b), 0);
}

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown size={12} className="text-slate-600" />;
  return sortDir === "asc" ? (
    <ChevronUp size={12} className="text-blue-400" />
  ) : (
    <ChevronDown size={12} className="text-blue-400" />
  );
}

function Th({
  label,
  col,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (col: SortKey) => void;
}) {
  return (
    <th
      className="px-4 py-3 font-medium cursor-pointer select-none hover:text-slate-300 transition-colors"
      onClick={() => onSort(col)}
    >
      <span className="flex items-center gap-1">
        {label}
        <SortIcon col={col} sortKey={sortKey} sortDir={sortDir} />
      </span>
    </th>
  );
}

function HostRow({ host, i, isReserved }: { host: Host; i: number; isReserved: boolean }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Omit<DhcpClient, "id">>({
    enable: 1,
    hostname: "",
    macaddress: "",
    ipaddress: "",
    ip6address: "",
  });
  const create = useCreateDhcpClient();
  const { checking, conflict, clearConflict, check } = useIpCheck();

  function openAdd() {
    setDraft({
      enable: 1,
      hostname: host.hostname ?? "",
      macaddress: host.macaddress ?? "",
      ipaddress: host.ipaddress ?? "",
      ip6address: "",
    });
    setAdding(true);
  }

  if (adding) {
    return (
      <>
        <tr className="border-t border-slate-700/50 bg-slate-800/40">
          <td className="px-4 py-2" colSpan={2}>
            <input
              className="input-cell w-full"
              placeholder="Nom d'hôte"
              value={draft.hostname}
              onChange={(e) => setDraft({ ...draft, hostname: e.target.value })}
            />
          </td>
          <td className="px-4 py-2">
            <input
              className="input-cell font-mono w-full"
              placeholder="192.168.1.x"
              value={draft.ipaddress}
              onChange={(e) => { setDraft({ ...draft, ipaddress: e.target.value }); clearConflict(); }}
            />
          </td>
          <td className="px-4 py-2">
            <input
              className="input-cell font-mono w-full"
              placeholder="aa:bb:cc:dd:ee:ff"
              value={draft.macaddress}
              onChange={(e) => { setDraft({ ...draft, macaddress: e.target.value }); clearConflict(); }}
            />
          </td>
          <td className="px-4 py-2" colSpan={2}>
            <div className="flex gap-1.5 items-center">
              <button
                type="button"
                title={conflict ? "Forcer malgré le conflit" : "Créer la réservation"}
                disabled={!draft.macaddress || !draft.ipaddress || create.isPending || checking}
                onClick={() => check(draft.ipaddress, draft.macaddress, () =>
                  create.mutate(draft, { onSuccess: () => setAdding(false) })
                )}
                className={`p-1 rounded disabled:opacity-40 transition-colors ${conflict ? "text-amber-400 hover:text-amber-300" : "text-blue-400 hover:text-blue-300"}`}
              >
                {conflict ? <AlertTriangle size={14} /> : <Check size={14} />}
              </button>
              <button
                type="button"
                title="Annuler"
                onClick={() => { setAdding(false); clearConflict(); }}
                className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={14} />
              </button>
              {create.error && (
                <span className="text-xs text-red-400">{(create.error as Error).message}</span>
              )}
            </div>
          </td>
          <td />
        </tr>
        {conflict && (
          <tr className="bg-amber-500/10 border-t border-amber-500/20">
            <td colSpan={7} className="px-4 py-1.5 text-xs text-amber-400 flex items-center gap-1.5">
              <AlertTriangle size={12} />
              {conflict} — cliquer à nouveau pour forcer
            </td>
          </tr>
        )}
      </>
    );
  }

  return (
    <tr
      key={host.macaddress ?? host.id ?? i}
      className="border-t border-slate-700/50 hover:bg-slate-800/40 transition-colors"
    >
      <td className="px-4 py-2.5">
        <Badge active={host.active} />
      </td>
      <td className="px-4 py-2.5 text-sm text-slate-200">
        {host.hostname || <span className="text-slate-500 italic">sans nom</span>}
      </td>
      <td className="px-4 py-2.5 text-sm font-mono text-slate-300">{host.ipaddress ?? "—"}</td>
      <td className="px-4 py-2.5 text-xs font-mono text-slate-400">{host.macaddress ?? "—"}</td>
      <td className="px-4 py-2.5 text-xs text-slate-500 uppercase">{host.type ?? "—"}</td>
      <td className="px-4 py-2.5 text-xs text-slate-500">{relativeTime(host.lastseen)}</td>
      <td className="px-4 py-2.5">
        {isReserved ? (
          <span title="Réservation DHCP active" className="p-1 inline-flex text-blue-400">
            <Bookmark size={14} />
          </span>
        ) : (
          <button
            type="button"
            title="Ajouter une réservation DHCP"
            onClick={openAdd}
            className="p-1 rounded text-slate-500 hover:text-blue-400 transition-colors"
          >
            <BookmarkPlus size={14} />
          </button>
        )}
      </td>
    </tr>
  );
}

export default function Hosts() {
  const { data: raw, isLoading, error, dataUpdatedAt } = useHosts();
  const { data: rawClients } = useDhcpClients();
  const qc = useQueryClient();

  const reservedMacs = useMemo<Set<string>>(() => {
    const clients = Array.isArray(rawClients)
      ? rawClients.length > 0 && "macaddress" in rawClients[0]
        ? rawClients
        : rawClients[0]?.dhcp?.clients ?? rawClients[0]?.dhcpclients ?? []
      : [];
    return new Set((clients as { macaddress?: string }[]).map((c) => c.macaddress?.toLowerCase() ?? "").filter(Boolean));
  }, [rawClients]);
  const [filter, setFilter] = useState("");
  const [showActive, setShowActive] = useState<"all" | "active" | "inactive">("all");
  const [sortKey, setSortKey] = useState<SortKey>("active");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const hosts = parseHosts(raw);

  const filtered = useMemo(() => {
    if (!hosts) return null;
    let list = hosts;

    if (showActive === "active") list = list.filter((h) => h.active);
    else if (showActive === "inactive") list = list.filter((h) => !h.active);

    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(
        (h) =>
          h.hostname?.toLowerCase().includes(q) ||
          h.ipaddress?.includes(q) ||
          h.macaddress?.toLowerCase().includes(q)
      );
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "hostname") {
        cmp = (a.hostname ?? "").localeCompare(b.hostname ?? "");
      } else if (sortKey === "ipaddress") {
        cmp = ipToNum(a.ipaddress) - ipToNum(b.ipaddress);
      } else if (sortKey === "lastseen") {
        cmp = (a.lastseen ?? 0) - (b.lastseen ?? 0);
      } else if (sortKey === "active") {
        cmp = (a.active ?? 0) - (b.active ?? 0);
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [hosts, filter, showActive, sortKey, sortDir]);

  function handleSort(col: SortKey) {
    if (col === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(col);
      setSortDir("desc");
    }
  }

  const active = hosts?.filter((h) => h.active).length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex flex-col gap-3">
        <p className="text-red-400 text-sm font-medium">Erreur</p>
        <pre className="text-xs text-red-300 bg-slate-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
          {error instanceof Error ? error.message : JSON.stringify(error, null, 2)}
        </pre>
      </div>
    );
  }

  if (!hosts) {
    return (
      <div className="p-6 flex flex-col gap-3">
        <p className="text-amber-400 text-sm font-medium">Format inattendu</p>
        <pre className="text-xs text-slate-300 bg-slate-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(raw, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4 overflow-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold text-slate-100">Appareils</h1>
          <span className="text-xs text-slate-500 bg-slate-800 px-2 py-0.5 rounded-full">
            {active} / {hosts.length} connectés
          </span>
        </div>
        <div className="flex items-center gap-3">
          {dataUpdatedAt > 0 && (
            <span className="text-xs text-slate-600">
              màj{" "}
              {new Date(dataUpdatedAt).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
          <button
            type="button"
            onClick={() => qc.invalidateQueries({ queryKey: ["hosts"] })}
            className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
            title="Rafraîchir"
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <input
          type="search"
          placeholder="Rechercher (nom, IP, MAC)…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors w-64"
        />
        <div className="flex rounded-lg overflow-hidden border border-slate-700 text-xs">
          {(["all", "active", "inactive"] as const).map((v) => (
            <button
              type="button"
              key={v}
              onClick={() => setShowActive(v)}
              className={`px-3 py-1.5 transition-colors ${
                showActive === v
                  ? "bg-blue-600 text-white"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {v === "all" ? "Tous" : v === "active" ? "Connectés" : "Inactifs"}
            </button>
          ))}
        </div>
        {filtered && filtered.length !== hosts.length && (
          <span className="text-xs text-slate-500">
            {filtered.length} résultat{filtered.length !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Table */}
      <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-500 border-b border-slate-700">
              <Th
                label="État"
                col="active"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <Th
                label="Hôte"
                col="hostname"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <Th
                label="IP"
                col="ipaddress"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <th className="px-4 py-3 font-medium">MAC</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <Th
                label="Vu il y a"
                col="lastseen"
                sortKey={sortKey}
                sortDir={sortDir}
                onSort={handleSort}
              />
              <th className="px-4 py-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered?.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                  Aucun appareil trouvé
                </td>
              </tr>
            )}
            {filtered?.map((h, i) => (
              <HostRow
                key={h.macaddress ?? h.id ?? i}
                host={h}
                i={i}
                isReserved={reservedMacs.has(h.macaddress?.toLowerCase() ?? "")}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

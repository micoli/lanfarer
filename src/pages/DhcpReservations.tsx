import { useState } from "react";
import { Plus, Trash2, Pencil, Check, X, AlertTriangle } from "lucide-react";
import {
  useDhcpClients,
  useCreateDhcpClient,
  useUpdateDhcpClient,
  useDeleteDhcpClient,
  useIpCheck,
} from "../hooks/useBbox";
import type { DhcpClient } from "../lib/bbox/types";

// The BBox API may return clients in several shapes — normalise them all.
function normaliseClients(raw: unknown): DhcpClient[] | null {
  if (!raw) return null;
  // Direct array of clients: [{id, macaddress, ...}]
  if (Array.isArray(raw) && raw.length > 0 && "macaddress" in raw[0]) return raw as DhcpClient[];
  // Wrapped: [{dhcp: {clients: [...]}}]
  if (Array.isArray(raw) && raw.length > 0 && raw[0]?.dhcp?.clients)
    return raw[0].dhcp.clients as DhcpClient[];
  // Wrapped: [{dhcpclients: [...]}]
  if (Array.isArray(raw) && raw.length > 0 && raw[0]?.dhcpclients)
    return raw[0].dhcpclients as DhcpClient[];
  // Empty array = no reservations
  if (Array.isArray(raw) && raw.length === 0) return [];
  return null;
}

const EMPTY: Omit<DhcpClient, "id"> = {
  enable: 1,
  hostname: "",
  macaddress: "",
  ipaddress: "",
  ip6address: "",
};

function ClientRow({
  client,
  onSave,
  onDelete,
}: {
  client: DhcpClient;
  onSave: (c: DhcpClient) => void;
  onDelete: (id: number) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DhcpClient>(client);

  function handleSave() {
    onSave(draft);
    setEditing(false);
  }

  function handleCancel() {
    setDraft(client);
    setEditing(false);
  }

  if (editing) {
    return (
      <tr className="border-t border-slate-800">
        <td className="px-4 py-2">
          <input
            className="input-cell"
            value={draft.hostname}
            onChange={(e) => setDraft({ ...draft, hostname: e.target.value })}
          />
        </td>
        <td className="px-4 py-2">
          <input
            className="input-cell font-mono"
            value={draft.macaddress}
            onChange={(e) => setDraft({ ...draft, macaddress: e.target.value })}
            placeholder="aa:bb:cc:dd:ee:ff"
          />
        </td>
        <td className="px-4 py-2">
          <input
            className="input-cell font-mono"
            value={draft.ipaddress}
            onChange={(e) => setDraft({ ...draft, ipaddress: e.target.value })}
            placeholder="192.168.1.x"
          />
        </td>
        <td className="px-4 py-2">
          <select
            className="input-cell"
            value={draft.enable}
            onChange={(e) => setDraft({ ...draft, enable: Number(e.target.value) })}
          >
            <option value={1}>Actif</option>
            <option value={0}>Inactif</option>
          </select>
        </td>
        <td className="px-4 py-2 flex gap-1.5">
          <ActionBtn onClick={handleSave} title="Sauvegarder">
            <Check size={14} />
          </ActionBtn>
          <ActionBtn onClick={handleCancel} title="Annuler" variant="neutral">
            <X size={14} />
          </ActionBtn>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-slate-800 hover:bg-slate-800/50 transition-colors">
      <td className="px-4 py-2.5 text-sm text-slate-200">{client.hostname || "—"}</td>
      <td className="px-4 py-2.5 text-sm font-mono text-slate-300">{client.macaddress}</td>
      <td className="px-4 py-2.5 text-sm font-mono text-slate-300">{client.ipaddress}</td>
      <td className="px-4 py-2.5">
        <span
          className={`text-xs px-2 py-0.5 rounded-full ${
            client.enable ? "bg-green-500/15 text-green-400" : "bg-slate-700 text-slate-500"
          }`}
        >
          {client.enable ? "Actif" : "Inactif"}
        </span>
      </td>
      <td className="px-4 py-2.5 flex gap-1.5">
        <ActionBtn onClick={() => setEditing(true)} title="Modifier" variant="neutral">
          <Pencil size={14} />
        </ActionBtn>
        <ActionBtn onClick={() => onDelete(client.id)} title="Supprimer" variant="danger">
          <Trash2 size={14} />
        </ActionBtn>
      </td>
    </tr>
  );
}

function AddRow({ onAdd }: { onAdd: (c: Omit<DhcpClient, "id">) => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Omit<DhcpClient, "id">>(EMPTY);
  const { checking, conflict, clearConflict, check } = useIpCheck();

  function handleAdd() {
    check(draft.ipaddress, draft.macaddress, () => {
      onAdd(draft);
      setDraft(EMPTY);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <tr className="border-t border-slate-800">
        <td colSpan={5} className="px-4 py-2">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
          >
            <Plus size={14} />
            Ajouter une réservation
          </button>
        </td>
      </tr>
    );
  }

  return (
    <>
      <tr className="border-t border-slate-800 bg-slate-800/40">
        <td className="px-4 py-2">
          <input
            className="input-cell"
            placeholder="Nom d'hôte"
            value={draft.hostname}
            onChange={(e) => setDraft({ ...draft, hostname: e.target.value })}
          />
        </td>
        <td className="px-4 py-2">
          <input
            className="input-cell font-mono"
            placeholder="aa:bb:cc:dd:ee:ff"
            value={draft.macaddress}
            onChange={(e) => { setDraft({ ...draft, macaddress: e.target.value }); clearConflict(); }}
          />
        </td>
        <td className="px-4 py-2">
          <input
            className="input-cell font-mono"
            placeholder="192.168.1.x"
            value={draft.ipaddress}
            onChange={(e) => { setDraft({ ...draft, ipaddress: e.target.value }); clearConflict(); }}
          />
        </td>
        <td className="px-4 py-2">
          <select
            className="input-cell"
            value={draft.enable}
            onChange={(e) => setDraft({ ...draft, enable: Number(e.target.value) })}
          >
            <option value={1}>Actif</option>
            <option value={0}>Inactif</option>
          </select>
        </td>
        <td className="px-4 py-2 flex gap-1.5 items-center">
          <ActionBtn
            onClick={handleAdd}
            title={conflict ? "Forcer malgré le conflit" : "Ajouter"}
            disabled={!draft.macaddress || !draft.ipaddress || checking}
            variant={conflict ? "danger" : "primary"}
          >
            {conflict ? <AlertTriangle size={14} /> : <Check size={14} />}
          </ActionBtn>
          <ActionBtn onClick={() => { setOpen(false); clearConflict(); }} title="Annuler" variant="neutral">
            <X size={14} />
          </ActionBtn>
        </td>
      </tr>
      {conflict && (
        <tr className="bg-amber-500/10 border-t border-amber-500/20">
          <td colSpan={5} className="px-4 py-1.5 text-xs text-amber-400 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            {conflict} — cliquer à nouveau pour forcer
          </td>
        </tr>
      )}
    </>
  );
}

function ActionBtn({
  onClick,
  title,
  children,
  variant = "primary",
  disabled,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  variant?: "primary" | "neutral" | "danger";
  disabled?: boolean;
}) {
  const cls = {
    primary: "text-blue-400 hover:text-blue-300",
    neutral: "text-slate-400 hover:text-slate-200",
    danger: "text-red-400 hover:text-red-300",
  }[variant];
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      disabled={disabled}
      className={`p-1 rounded transition-colors disabled:opacity-40 ${cls}`}
    >
      {children}
    </button>
  );
}

export default function DhcpReservations() {
  const { data: rawData, isLoading, error } = useDhcpClients();
  const create = useCreateDhcpClient();
  const update = useUpdateDhcpClient();
  const remove = useDeleteDhcpClient();

  // Normalise whatever the BBox API returns into a flat DhcpClient[]
  const clients = normaliseClients(rawData);

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
        <p className="text-red-400 text-sm font-medium">Erreur de récupération</p>
        <pre className="text-xs text-red-300 bg-slate-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
          {error instanceof Error ? error.message : JSON.stringify(error, null, 2)}
        </pre>
        <p className="text-xs text-slate-500">Vérifiez la console pour la réponse brute.</p>
      </div>
    );
  }

  // If we got data but couldn't normalise it, show the raw response to help diagnose
  if (!clients && rawData !== undefined) {
    return (
      <div className="p-6 flex flex-col gap-3">
        <p className="text-amber-400 text-sm font-medium">Format de réponse inattendu</p>
        <pre className="text-xs text-slate-300 bg-slate-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(rawData, null, 2)}
        </pre>
        <p className="text-xs text-slate-500">Partage cette réponse pour adapter le parseur.</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4 overflow-auto">
      <h1 className="text-lg font-semibold text-slate-100">Réservations DHCP</h1>

      <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-medium">Hôte</th>
              <th className="px-4 py-3 font-medium">MAC</th>
              <th className="px-4 py-3 font-medium">IP</th>
              <th className="px-4 py-3 font-medium">État</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {clients?.map((c) => (
              <ClientRow
                key={c.macaddress || c.id}
                client={c}
                onSave={(updated) => update.mutate(updated)}
                onDelete={(id) => remove.mutate(id)}
              />
            ))}
            <AddRow onAdd={(c) => create.mutate(c)} />
          </tbody>
        </table>
      </div>

      {(create.error || update.error || remove.error) && (
        <p className="text-xs text-red-400">
          Erreur : {((create.error ?? update.error ?? remove.error) as Error)?.message}
        </p>
      )}
    </div>
  );
}

import { AlertTriangle, Check, Download, Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
  useCreateDhcpClient,
  useDeleteDhcpClient,
  useDhcpClients,
  useIpCheck,
  useUpdateDhcpClient,
} from "../hooks/useBbox";
import type { components } from "../lib/api/schema.d.ts";

type DhcpClient = components["schemas"]["DhcpClient"];

import { exportCsv } from "../lib/exportCsv";

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
  const { t } = useTranslation();
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
            <option value={1}>{t("dhcpReservations.active")}</option>
            <option value={0}>{t("dhcpReservations.inactive")}</option>
          </select>
        </td>
        <td className="px-4 py-2 flex gap-1.5">
          <ActionBtn onClick={handleSave} title={t("common.save")}>
            <Check size={14} />
          </ActionBtn>
          <ActionBtn onClick={handleCancel} title={t("common.cancel")} variant="neutral">
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
          {client.enable ? t("dhcpReservations.active") : t("dhcpReservations.inactive")}
        </span>
      </td>
      <td className="px-4 py-2.5 flex gap-1.5">
        <ActionBtn onClick={() => setEditing(true)} title={t("common.edit")} variant="neutral">
          <Pencil size={14} />
        </ActionBtn>
        <ActionBtn onClick={() => onDelete(client.id)} title={t("common.delete")} variant="danger">
          <Trash2 size={14} />
        </ActionBtn>
      </td>
    </tr>
  );
}

function AddRow({ onAdd }: { onAdd: (c: Omit<DhcpClient, "id">) => void }) {
  const { t } = useTranslation();
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
            {t("dhcpReservations.addReservation")}
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
            placeholder={t("common.hostname")}
            value={draft.hostname}
            onChange={(e) => setDraft({ ...draft, hostname: e.target.value })}
          />
        </td>
        <td className="px-4 py-2">
          <input
            className="input-cell font-mono"
            placeholder="aa:bb:cc:dd:ee:ff"
            value={draft.macaddress}
            onChange={(e) => {
              setDraft({ ...draft, macaddress: e.target.value });
              clearConflict();
            }}
          />
        </td>
        <td className="px-4 py-2">
          <input
            className="input-cell font-mono"
            placeholder="192.168.1.x"
            value={draft.ipaddress}
            onChange={(e) => {
              setDraft({ ...draft, ipaddress: e.target.value });
              clearConflict();
            }}
          />
        </td>
        <td className="px-4 py-2">
          <select
            className="input-cell"
            value={draft.enable}
            onChange={(e) => setDraft({ ...draft, enable: Number(e.target.value) })}
          >
            <option value={1}>{t("dhcpReservations.active")}</option>
            <option value={0}>{t("dhcpReservations.inactive")}</option>
          </select>
        </td>
        <td className="px-4 py-2 flex gap-1.5 items-center">
          <ActionBtn
            onClick={handleAdd}
            title={conflict ? t("common.forceConflict") : t("common.add")}
            disabled={!draft.macaddress || !draft.ipaddress || checking}
            variant={conflict ? "danger" : "primary"}
          >
            {conflict ? <AlertTriangle size={14} /> : <Check size={14} />}
          </ActionBtn>
          <ActionBtn
            onClick={() => {
              setOpen(false);
              clearConflict();
            }}
            title={t("common.cancel")}
            variant="neutral"
          >
            <X size={14} />
          </ActionBtn>
        </td>
      </tr>
      {conflict && (
        <tr className="bg-amber-500/10 border-t border-amber-500/20">
          <td colSpan={5} className="px-4 py-1.5 text-xs text-amber-400 flex items-center gap-1.5">
            <AlertTriangle size={12} />
            {conflict}
            {t("common.clickAgainToForce")}
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
  const { routerId: routerIdParam } = useParams<{ routerId: string }>();
  const routerId = routerIdParam ?? null;
  const { t } = useTranslation();
  const { data: rawData, isLoading, error } = useDhcpClients(routerId);
  const create = useCreateDhcpClient(routerId);
  const update = useUpdateDhcpClient(routerId);
  const remove = useDeleteDhcpClient(routerId);

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
        <p className="text-red-400 text-sm font-medium">{t("dhcpReservations.fetchError")}</p>
        <pre className="text-xs text-red-300 bg-slate-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
          {error instanceof Error ? error.message : JSON.stringify(error, null, 2)}
        </pre>
        <p className="text-xs text-slate-500">{t("dhcpReservations.checkConsole")}</p>
      </div>
    );
  }

  // If we got data but couldn't normalise it, show the raw response to help diagnose
  if (!clients && rawData !== undefined) {
    return (
      <div className="p-6 flex flex-col gap-3">
        <p className="text-amber-400 text-sm font-medium">
          {t("dhcpReservations.unexpectedFormat")}
        </p>
        <pre className="text-xs text-slate-300 bg-slate-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
          {JSON.stringify(rawData, null, 2)}
        </pre>
        <p className="text-xs text-slate-500">{t("dhcpReservations.unexpectedFormatHint")}</p>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-4 overflow-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-100">{t("dhcpReservations.title")}</h1>
        <button
          type="button"
          onClick={() =>
            exportCsv(
              "reservations-dhcp.csv",
              [
                t("dhcpReservations.colHost"),
                t("dhcpReservations.colMac"),
                t("dhcpReservations.colIp"),
                t("dhcpReservations.colStatus"),
              ],
              (clients ?? []).map((c) => [
                c.hostname,
                c.macaddress,
                c.ipaddress,
                c.enable ? t("dhcpReservations.active") : t("dhcpReservations.inactive"),
              ])
            )
          }
          className="p-1.5 text-slate-400 hover:text-slate-200 transition-colors"
          title={t("common.exportCsv")}
        >
          <Download size={14} />
        </button>
      </div>

      <div className="bg-slate-800/60 rounded-xl border border-slate-700 overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3 font-medium">{t("dhcpReservations.colHost")}</th>
              <th className="px-4 py-3 font-medium">{t("dhcpReservations.colMac")}</th>
              <th className="px-4 py-3 font-medium">{t("dhcpReservations.colIp")}</th>
              <th className="px-4 py-3 font-medium">{t("dhcpReservations.colStatus")}</th>
              <th className="px-4 py-3 font-medium">{t("dhcpReservations.colActions")}</th>
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
          {t("common.error")} : {((create.error ?? update.error ?? remove.error) as Error)?.message}
        </p>
      )}
    </div>
  );
}

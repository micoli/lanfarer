import { Check, Download, Lock, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  useCreateDhcpOption,
  useDeleteDhcpOption,
  useDhcpConfig,
  useDhcpOptions,
  useUpdateDhcpConfig,
  useUpdateDhcpOption,
} from "../hooks/useBbox";
import type {
  DhcpOption,
  DhcpOptionCapability,
  DhcpOptionsResponse,
  DhcpResponse,
} from "../lib/bbox/types";
import { exportCsv } from "../lib/exportCsv";

function parseDhcpOptions(raw: unknown): DhcpOptionsResponse["dhcp"] | null {
  if (!raw) return null;
  if (Array.isArray(raw) && raw[0]?.dhcp) return raw[0].dhcp as DhcpOptionsResponse["dhcp"];
  if (raw && typeof raw === "object" && "dhcp" in raw) return (raw as DhcpOptionsResponse).dhcp;
  return null;
}

function OptionRow({
  opt,
  cap,
  onSave,
  onDelete,
}: {
  opt: DhcpOption;
  cap?: DhcpOptionCapability;
  onSave: (id: number, option: number, value: string) => void;
  onDelete: (id: number) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(opt.value);

  return (
    <tr className="border-t border-slate-700 hover:bg-slate-800/40 transition-colors">
      <td className="px-3 py-2 text-sm font-mono text-slate-400">{opt.option}</td>
      <td className="px-3 py-2 text-xs text-slate-400">{cap?.description ?? "—"}</td>
      <td className="px-3 py-2 text-xs text-slate-500">{cap?.type ?? "—"}</td>
      <td className="px-3 py-2">
        {editing ? (
          <input
            className="input-cell font-mono w-40"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        ) : (
          <span className="text-sm font-mono text-slate-200">{opt.value}</span>
        )}
      </td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          {editing ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onSave(opt.id, opt.option, draft);
                  setEditing(false);
                }}
                className="p-1 text-blue-400 hover:text-blue-300 transition-colors"
                title={t("common.save")}
              >
                <Check size={13} />
              </button>
              <button
                type="button"
                onClick={() => {
                  setDraft(opt.value);
                  setEditing(false);
                }}
                className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                title={t("common.cancel")}
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setEditing(true)}
                title={t("common.edit")}
                className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
              >
                <Pencil size={13} />
              </button>
              <button
                type="button"
                onClick={() => onDelete(opt.id)}
                title={t("common.delete")}
                className="p-1 rounded text-red-400 hover:text-red-300 transition-colors"
              >
                <Trash2 size={13} />
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function DhcpOptionsTable({ raw }: { raw: unknown }) {
  const { t } = useTranslation();
  const parsed = parseDhcpOptions(raw);
  const [addOpen, setAddOpen] = useState(false);
  const [newOption, setNewOption] = useState<number>(6);
  const [newValue, setNewValue] = useState("");
  const create = useCreateDhcpOption();
  const update = useUpdateDhcpOption();
  const remove = useDeleteDhcpOption();

  if (!parsed) return null;

  const { options, optionsstatic, optionscapabilities } = parsed;
  const capMap = new Map(optionscapabilities.map((c) => [c.id, c]));

  return (
    <div className="flex flex-col gap-3 p-4 bg-slate-800/60 rounded-xl border border-slate-700">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
          {t("dhcpOptions.sectionTitle")}
        </h2>
        <button
          type="button"
          onClick={() =>
            exportCsv(
              "options-dhcp.csv",
              [
                t("dhcpOptions.colOption"),
                t("dhcpOptions.colDescription"),
                t("dhcpOptions.colType"),
                t("dhcpOptions.colValue"),
                "Static",
              ],
              [
                ...(optionsstatic ?? []).map((o) => [
                  o.option,
                  capMap.get(o.option)?.description ?? "",
                  capMap.get(o.option)?.type ?? "",
                  o.value,
                  "oui",
                ]),
                ...(options ?? []).map((o) => [
                  o.option,
                  capMap.get(o.option)?.description ?? "",
                  capMap.get(o.option)?.type ?? "",
                  o.value,
                  "non",
                ]),
              ]
            )
          }
          className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
          title={t("common.exportCsv")}
        >
          <Download size={13} />
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wider text-slate-500">
              <th className="px-3 py-2 font-medium">{t("dhcpOptions.colOption")}</th>
              <th className="px-3 py-2 font-medium">{t("dhcpOptions.colDescription")}</th>
              <th className="px-3 py-2 font-medium">{t("dhcpOptions.colType")}</th>
              <th className="px-3 py-2 font-medium">{t("dhcpOptions.colValue")}</th>
              <th className="px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {optionsstatic?.map((opt) => (
              <tr key={`static-${opt.id}`} className="border-t border-slate-700 opacity-60">
                <td className="px-3 py-2 text-sm font-mono text-slate-400">{opt.option}</td>
                <td className="px-3 py-2 text-xs text-slate-400">
                  {capMap.get(opt.option)?.description ?? "—"}
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">
                  {capMap.get(opt.option)?.type ?? "—"}
                </td>
                <td className="px-3 py-2 text-sm font-mono text-slate-300">{opt.value}</td>
                <td className="px-3 py-2">
                  <Lock size={11} className="text-slate-600" />
                </td>
              </tr>
            ))}
            {options?.map((opt) => (
              <OptionRow
                key={opt.id}
                opt={opt}
                cap={capMap.get(opt.option)}
                onSave={(id, option, value) => update.mutate({ id, option, value })}
                onDelete={(id) => remove.mutate(id)}
              />
            ))}
            {addOpen ? (
              <tr className="border-t border-slate-700 bg-slate-800/40">
                <td className="px-3 py-2" colSpan={2}>
                  <select
                    className="input-cell text-xs"
                    value={newOption}
                    onChange={(e) => setNewOption(Number(e.target.value))}
                  >
                    {optionscapabilities.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.id} — {c.description}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2 text-xs text-slate-500">{capMap.get(newOption)?.type}</td>
                <td className="px-3 py-2">
                  <input
                    className="input-cell font-mono w-40"
                    placeholder={t("dhcpOptions.valueLabel")}
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                  />
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        create.mutate({ option: newOption, value: newValue });
                        setAddOpen(false);
                        setNewValue("");
                      }}
                      disabled={!newValue}
                      className="p-1 text-blue-400 hover:text-blue-300 disabled:opacity-40 transition-colors"
                    >
                      <Check size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddOpen(false)}
                      className="p-1 text-slate-400 hover:text-slate-200 transition-colors"
                    >
                      <X size={13} />
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              <tr className="border-t border-slate-700">
                <td colSpan={5} className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Plus size={13} />
                    {t("dhcpOptions.addOption")}
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {(create.error || update.error || remove.error) && (
        <p className="text-xs text-red-400">
          {((create.error ?? update.error ?? remove.error) as Error)?.message}
        </p>
      )}
    </div>
  );
}

function parseDhcp(raw: unknown): DhcpResponse["dhcp"] | null {
  if (!raw) return null;
  if (Array.isArray(raw) && raw[0]?.dhcp) return raw[0].dhcp as DhcpResponse["dhcp"];
  if (raw && typeof raw === "object" && "dhcp" in raw) return (raw as DhcpResponse).dhcp;
  return null;
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  const id = label.toLowerCase().replace(/\s+/g, "-");
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-xs font-medium text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-colors font-mono"
      />
    </div>
  );
}

export default function DhcpOptions() {
  const { t } = useTranslation();
  const { data: rawDhcp, isLoading: loadingDhcp, error: errorDhcp } = useDhcpConfig();
  const { data: rawDhcpOptions, isLoading: loadingOptions } = useDhcpOptions();
  const updateDhcp = useUpdateDhcpConfig();

  const dhcp = parseDhcp(rawDhcp);

  const [enable, setEnable] = useState(1);
  const [minaddress, setMinaddress] = useState("");
  const [maxaddress, setMaxaddress] = useState("");
  const [leasetime, setLeasetime] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!dhcp) return;
    setEnable(dhcp.enable ?? 1);
    setMinaddress(dhcp.minaddress ?? "");
    setMaxaddress(dhcp.maxaddress ?? "");
    setLeasetime(String(dhcp.leasetime ?? ""));
  }, [dhcp]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    await updateDhcp.mutateAsync({ enable, minaddress, maxaddress, leasetime: Number(leasetime) });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (loadingDhcp || loadingOptions) {
    return (
      <div className="flex items-center justify-center flex-1">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (errorDhcp) {
    return (
      <div className="p-6 flex flex-col gap-3">
        <p className="text-red-400 text-sm font-medium">{t("dhcpOptions.errorDhcp")}</p>
        <pre className="text-xs text-red-300 bg-slate-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
          {errorDhcp instanceof Error ? errorDhcp.message : JSON.stringify(errorDhcp, null, 2)}
        </pre>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg">
      <h1 className="text-lg font-semibold text-slate-100 mb-6">{t("dhcpOptions.title")}</h1>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex items-center justify-between p-4 bg-slate-800/60 rounded-xl border border-slate-700">
          <span className="text-sm text-slate-200">{t("dhcpOptions.serverEnabled")}</span>
          <button
            type="button"
            onClick={() => setEnable(enable ? 0 : 1)}
            className={`w-11 h-6 rounded-full transition-colors relative ${enable ? "bg-blue-600" : "bg-slate-700"}`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enable ? "translate-x-5" : "translate-x-0.5"}`}
            />
          </button>
        </div>

        <div className="flex flex-col gap-4 p-4 bg-slate-800/60 rounded-xl border border-slate-700">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            {t("dhcpOptions.range")}
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <Field
              label={t("dhcpOptions.rangeStart")}
              value={minaddress}
              onChange={setMinaddress}
              placeholder="192.168.2.10"
            />
            <Field
              label={t("dhcpOptions.rangeEnd")}
              value={maxaddress}
              onChange={setMaxaddress}
              placeholder="192.168.2.199"
            />
          </div>
        </div>

        <Field
          label={t("dhcpOptions.leaseDuration")}
          value={leasetime}
          onChange={setLeasetime}
          type="number"
          placeholder="86400"
        />

        {updateDhcp.error && (
          <p className="text-xs text-red-400">
            {t("common.error")} : {(updateDhcp.error as Error).message}
          </p>
        )}

        <button
          type="submit"
          disabled={updateDhcp.isPending}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-all disabled:opacity-50 text-sm"
        >
          <Save size={15} />
          {updateDhcp.isPending ? t("common.saving") : saved ? t("common.saved") : t("common.save")}
        </button>
      </form>

      <hr className="border-slate-700 my-6" />

      <DhcpOptionsTable raw={rawDhcpOptions} />
    </div>
  );
}

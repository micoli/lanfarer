import { Terminal } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { HostToolPopup } from "./HostToolPopup.tsx";

export function HostProbeButton({ ip, mac }: { ip: string; mac?: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!ip) return null;
  return (
    <>
      <button
        type="button"
        title={t("probe.title")}
        onClick={() => setOpen(true)}
        className="ml-1 p-0.5 rounded text-violet-500 hover:text-red-400 transition-colors inline-flex items-center"
      >
        <Terminal size={11} />
      </button>
      {open && <HostToolPopup ip={ip} mac={mac} onClose={() => setOpen(false)} />}
    </>
  );
}

import { useTranslation } from "react-i18next";
import { useActivePlugins } from "../../../../src/hooks/useActivePlugins.ts";

export default function WifiPage() {
  const { t } = useTranslation();
  const activePlugins = useActivePlugins();

  const sections = activePlugins
    .map((p) => p.wifiSection)
    .filter((S): S is React.ComponentType => S !== undefined);

  return (
    <div className="p-6 flex flex-col gap-6 overflow-auto">
      <h1 className="text-lg font-semibold text-slate-100">{t("wifi.title")}</h1>
      {sections.map((Section, i) => (
        <Section key={i} />
      ))}
    </div>
  );
}

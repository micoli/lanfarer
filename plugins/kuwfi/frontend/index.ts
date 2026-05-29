import type { FrontendPlugin } from "../../frontend-plugin.ts";
import { useKuwfiHosts } from "./hooks/useKuwfi.ts";
import KuwfiHotspotSection from "./sections/HotspotSection.tsx";
import KuwfiWifiSection from "./sections/WifiSection.tsx";

export const plugin: FrontendPlugin = {
  type: "kuwfi",
  hostListProvider: useKuwfiHosts,
  hotspotSection: KuwfiHotspotSection,
  wifiSection: KuwfiWifiSection,
};

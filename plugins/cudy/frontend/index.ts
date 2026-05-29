import type { FrontendPlugin } from "../../frontend-plugin.ts";
import { useCudyHosts } from "./hooks/useCudy.ts";
import CudyBandwidthCard from "./sections/BandwidthCard.tsx";
import CudyHotspotSection from "./sections/HotspotSection.tsx";
import CudyWifiSection from "./sections/WifiSection.tsx";
import CudyBandwidthWidget from "./widgets/CudyBandwidthWidget.tsx";

export const plugin: FrontendPlugin = {
  type: "cudy",
  hostListProvider: useCudyHosts,
  hotspotSection: CudyHotspotSection,
  wifiSection: CudyWifiSection,
  bandwidthCard: CudyBandwidthCard,
  widgets: [{ type: "cudy-bandwidth", component: CudyBandwidthWidget }],
};

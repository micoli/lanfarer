import type { FrontendPlugin } from "../../frontend-plugin.ts";
import { useAirportHosts } from "./hooks/useAirport.ts";
import AirportBandwidthCard from "./sections/BandwidthCard.tsx";
import AirportHotspotSection from "./sections/HotspotSection.tsx";
import AirportWifiSection from "./sections/WifiSection.tsx";

export const plugin: FrontendPlugin = {
  type: "airport",
  hostListProvider: useAirportHosts,
  hotspotSection: AirportHotspotSection,
  wifiSection: AirportWifiSection,
  bandwidthCard: AirportBandwidthCard,
};

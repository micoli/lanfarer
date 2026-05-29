import { Network, Radio, Settings2 } from "lucide-react";
import type { FrontendPlugin } from "../../frontend-plugin.ts";
import { useHosts } from "./hooks/useBbox.ts";
import BboxBandwidthCard from "./sections/BandwidthCard.tsx";
import BboxHotspotSection from "./sections/HotspotSection.tsx";
import BboxWifiSection from "./sections/WifiSection.tsx";
import DhcpOptions from "./pages/DhcpOptions";
import DhcpReservations from "./pages/DhcpReservations";
import WifiPage from "./pages/Wifi";
import BboxDownstreamWidget from "./widgets/BboxDownstreamWidget.tsx";
import BboxFirmwareWidget from "./widgets/BboxFirmwareWidget.tsx";
import BboxUpstreamWidget from "./widgets/BboxUpstreamWidget.tsx";
import BboxUptimeWidget from "./widgets/BboxUptimeWidget.tsx";
import BboxWanGraphsWidget from "./widgets/BboxWanGraphsWidget.tsx";

export const plugin: FrontendPlugin = {
  type: "bbox",
  hostListProvider: useHosts,
  routes: [
    { path: "/wifi", component: WifiPage },
    { path: "/dhcp/:routerId/options", component: DhcpOptions },
    { path: "/dhcp/:routerId/reservations", component: DhcpReservations },
  ],
  navItems: [
    { id: "wifi", icon: Radio, labelKey: "nav.wifi", path: "/wifi" },
    {
      id: "dhcp-options",
      icon: Settings2,
      labelKey: "nav.dhcpOptions",
      path: (r) => `/dhcp/${r}/options`,
    },
    {
      id: "dhcp-reservations",
      icon: Network,
      labelKey: "nav.dhcpReservations",
      path: (r) => `/dhcp/${r}/reservations`,
    },
  ],
  hotspotSection: BboxHotspotSection,
  wifiSection: BboxWifiSection,
  bandwidthCard: BboxBandwidthCard,
  widgets: [
    { type: "bbox-uptime", component: BboxUptimeWidget },
    { type: "bbox-firmware", component: BboxFirmwareWidget },
    { type: "bbox-downstream", component: BboxDownstreamWidget },
    { type: "bbox-upstream", component: BboxUpstreamWidget },
    { type: "bbox-wan-graphs", component: BboxWanGraphsWidget },
  ],
};

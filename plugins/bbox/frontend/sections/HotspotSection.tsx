import { useMemo } from "react";
import { AccessPointCard } from "../../../../src/components/AccessPointCard.tsx";
import type { RouterConfig } from "../../../../plugins/frontend-plugin.ts";
import { useDhcpClients } from "../hooks/useBbox.ts";
import { useBboxWireless } from "../hooks/useBboxWireless.ts";
import { useMacHostnames } from "../hooks/useMacHostnames.ts";
import { useMacIps } from "../hooks/useMacIps.ts";
import { useDhcpRouterId } from "../../../../src/hooks/useUiConfig.ts";

function BboxRouterSection({ routerId, routerIp }: { routerId: string; routerIp?: string }) {
  const dhcpRouterId = useDhcpRouterId();
  const { data: bboxWireless } = useBboxWireless(routerId);
  const hostnames = useMacHostnames(routerId);
  const ips = useMacIps(routerId);
  const { data: dhcpData } = useDhcpClients(dhcpRouterId);

  const reservedMacs = useMemo(() => {
    const map = new Map();
    for (const c of dhcpData?.clients ?? []) {
      if (c.macaddress) map.set(c.macaddress.toLowerCase(), c);
    }
    return map;
  }, [dhcpData]);

  return (
    <>
      {[...(bboxWireless?.accessPoints ?? [])]
        .sort((a, b) => {
          const s = a.ssid.localeCompare(b.ssid);
          if (s !== 0) return s;
          return a.band.localeCompare(b.band);
        })
        .map((ap, i) => (
          <AccessPointCard
            key={`bbox-${routerId}-${ap.ssid}-${i}`}
            ap={ap}
            routerName={ap.ssid}
            routerSubtitle={routerIp}
            routerOnline={bboxWireless?.online ?? false}
            hostnames={hostnames}
            ips={ips}
            dhcpRouterId={dhcpRouterId}
            reservedMacs={reservedMacs}
          />
        ))}
    </>
  );
}

export default function BboxHotspotSection({ routers }: { routers: RouterConfig[] }) {
  return (
    <>
      {routers.map((r) => (
        <BboxRouterSection key={r.name} routerId={r.name} routerIp={r.ip} />
      ))}
    </>
  );
}

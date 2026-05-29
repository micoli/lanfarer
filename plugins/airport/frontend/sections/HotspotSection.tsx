import { useMemo } from "react";
import { AccessPointCard } from "../../../../src/components/AccessPointCard.tsx";
import type { RouterConfig } from "../../../../plugins/frontend-plugin.ts";
import type { AccessPoint } from "../../../contracts.ts";
import { useDhcpClients } from "../../../bbox/frontend/hooks/useBbox.ts";
import { useMacHostnames } from "../../../bbox/frontend/hooks/useMacHostnames.ts";
import { useDhcpRouterId, useRouters } from "../../../../src/hooks/useUiConfig.ts";
import type { AirportAccessPoint } from "../hooks/useAirport.ts";
import { useAirportWireless } from "../hooks/useAirport.ts";

function AirportRouterCards({ routerId, routerName }: { routerId: string; routerName: string }) {
  const allRouters = useRouters();
  const bboxRouterId = allRouters?.find((r) => r.type === "bbox")?.name ?? null;
  const dhcpRouterId = useDhcpRouterId();
  const { data: wireless, isLoading, isError } = useAirportWireless(routerId);
  const hostnames = useMacHostnames(bboxRouterId);
  const { data: dhcpData } = useDhcpClients(dhcpRouterId);

  const reservedMacs = useMemo(() => {
    const map = new Map();
    for (const c of dhcpData?.clients ?? []) {
      if (c.macaddress) map.set(c.macaddress.toLowerCase(), c);
    }
    return map;
  }, [dhcpData]);

  const online = wireless?.online ?? false;

  if (isLoading || (!wireless && !isError)) {
    const placeholder: AccessPoint = { ssid: routerName, band: "2.4G", channel: 0, clients: [] };
    return (
      <AccessPointCard
        ap={placeholder}
        routerName={routerName}
        routerOnline={false}
        hostnames={() => undefined}
        ips={() => undefined}
        dhcpRouterId={null}
      />
    );
  }

  if (!wireless || !online || wireless.accessPoints.length === 0) {
    const placeholder: AccessPoint = { ssid: routerName, band: "2.4G", channel: 0, clients: [] };
    return (
      <AccessPointCard
        ap={placeholder}
        routerName={routerName}
        routerOnline={online}
        hostnames={() => undefined}
        ips={() => undefined}
        dhcpRouterId={null}
      />
    );
  }

  return (
    <>
      {wireless.accessPoints.map((ap: AirportAccessPoint, i) => {
        const apIp = (mac: string) => ap.clients.find((c) => c.mac === mac)?.ip;
        const asAccessPoint: AccessPoint = {
          ssid: ap.ssid,
          band: ap.band,
          channel: ap.channel,
          clients: ap.clients.map((c) => ({
            mac: c.mac,
            signal_dbm: c.rssi_dbm,
            tx_kbps: Math.round(c.txrate_mbps * 1000),
            rx_kbps: 0,
            inactive_ms: 0,
          })),
        };
        return (
          <AccessPointCard
            key={`${routerName}-${ap.ssid}-${ap.band}-${i}`}
            ap={asAccessPoint}
            routerName={routerName}
            routerOnline={online}
            hostnames={hostnames}
            ips={apIp}
            dhcpRouterId={dhcpRouterId}
            reservedMacs={reservedMacs}
          />
        );
      })}
    </>
  );
}

export default function AirportHotspotSection({ routers }: { routers: RouterConfig[] }) {
  const airportRouters = routers.filter((r) => r.type === "airport");
  if (airportRouters.length === 0) return null;

  return (
    <>
      {airportRouters.map((r) => (
        <AirportRouterCards key={r.name} routerId={r.name} routerName={r.name} />
      ))}
    </>
  );
}

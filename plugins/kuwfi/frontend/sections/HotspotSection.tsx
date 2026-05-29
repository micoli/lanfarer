import { useMemo } from "react";
import { AccessPointCard } from "../../../../src/components/AccessPointCard.tsx";
import type { RouterConfig } from "../../../../plugins/frontend-plugin.ts";
import type { AccessPoint } from "../../../contracts.ts";
import { useDhcpClients } from "../../../bbox/frontend/hooks/useBbox.ts";
import { useMacHostnames } from "../../../bbox/frontend/hooks/useMacHostnames.ts";
import { useKuwfiClients } from "../hooks/useKuwfi.ts";
import { useDhcpRouterId } from "../../../../src/hooks/useUiConfig.ts";
import { useRouters } from "../../../../src/hooks/useUiConfig.ts";

export default function KuwfiHotspotSection({ routers: _routers }: { routers: RouterConfig[] }) {
  const allRouters = useRouters();
  const bboxRouterId = allRouters?.find((r) => r.type === "bbox")?.name ?? null;
  const dhcpRouterId = useDhcpRouterId();
  const kuwfiRouters = useKuwfiClients();
  const hostnames = useMacHostnames(bboxRouterId);
  const { data: dhcpData } = useDhcpClients(dhcpRouterId);

  const reservedMacs = useMemo(
    () =>
      new Set(
        (dhcpData?.clients ?? []).map((c) => c.macaddress?.toLowerCase() ?? "").filter(Boolean),
      ),
    [dhcpData],
  );

  const flat = kuwfiRouters.data
    .flatMap((router) => router.accessPoints.map((ap) => ({ router, ap })))
    .sort((a, b) => {
      const s = a.router.name.localeCompare(b.router.name);
      if (s !== 0) return s;
      return a.ap.band.localeCompare(b.ap.band);
    });

  return (
    <>
      {flat.map(({ router, ap }, i) => {
        const kuwfiIp = (mac: string) => ap.clients.find((c) => c.mac === mac)?.ip;
        const asAccessPoint: AccessPoint = {
          ssid: ap.ssid,
          band: ap.band,
          channel: ap.channel,
          clients: ap.clients.map((c) => ({
            mac: c.mac,
            signal_dbm: c.signal_dbm,
            tx_kbps: 0,
            rx_kbps: 0,
            inactive_ms: 0,
          })),
        };
        return (
          <AccessPointCard
            key={`${router.name}-${ap.ssid}-${ap.band}-${i}`}
            ap={asAccessPoint}
            routerName={router.name}
            routerSubtitle={router.ip}
            routerOnline={router.online}
            hostnames={hostnames}
            ips={kuwfiIp}
            dhcpRouterId={dhcpRouterId}
            reservedMacs={reservedMacs}
          />
        );
      })}
    </>
  );
}

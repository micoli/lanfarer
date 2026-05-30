import { useMemo } from "react";
import { AccessPointCard } from "../../../../src/components/AccessPointCard.tsx";
import type { RouterConfig } from "../../../../plugins/frontend-plugin.ts";
import { useDhcpClients } from "../../../bbox/frontend/hooks/useBbox.ts";
import { useMacHostnames } from "../../../bbox/frontend/hooks/useMacHostnames.ts";
import { useMacIps } from "../../../bbox/frontend/hooks/useMacIps.ts";
import { useCudyClients } from "../hooks/useCudy.ts";
import { useDhcpRouterId } from "../../../../src/hooks/useUiConfig.ts";
import { useRouters } from "../../../../src/hooks/useUiConfig.ts";

export default function CudyHotspotSection({ routers: _routers }: { routers: RouterConfig[] }) {
  const allRouters = useRouters();
  const bboxRouterId = allRouters?.find((r) => r.type === "bbox")?.name ?? null;
  const dhcpRouterId = useDhcpRouterId();
  const { data: cudyData } = useCudyClients();
  const hostnames = useMacHostnames(bboxRouterId);
  const ips = useMacIps(bboxRouterId);
  const { data: dhcpData } = useDhcpClients(dhcpRouterId);

  const reservedMacs = useMemo(() => {
    const map = new Map();
    for (const c of dhcpData?.clients ?? []) {
      if (c.macaddress) map.set(c.macaddress.toLowerCase(), c);
    }
    return map;
  }, [dhcpData]);

  const flat = (cudyData?.routers ?? [])
    .flatMap((router) => router.wireless.accessPoints.map((ap) => ({ router, ap })))
    .sort((a, b) => {
      const s = a.router.name.localeCompare(b.router.name);
      if (s !== 0) return s;
      return a.ap.band.localeCompare(b.ap.band);
    });

  return (
    <>
      {flat.map(({ router, ap }, i) => (
        <AccessPointCard
          key={`${router.name}-${ap.ssid}-${i}`}
          ap={ap}
          routerName={router.name}
          routerSubtitle={router.ip}
          routerOnline={router.wireless.online}
          hostnames={hostnames}
          ips={ips}
          dhcpRouterId={dhcpRouterId}
          reservedMacs={reservedMacs}
        />
      ))}
    </>
  );
}

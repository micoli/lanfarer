import { AccessPointCard } from "../../../../src/components/AccessPointCard.tsx";
import type { RouterConfig } from "../../../../plugins/frontend-plugin.ts";
import { useRouters } from "../../../../src/hooks/useUiConfig.ts";
import { useMacHostnames } from "../../../bbox/frontend/hooks/useMacHostnames.ts";
import { useMacIps } from "../../../bbox/frontend/hooks/useMacIps.ts";
import { useCudyClients } from "../hooks/useCudy.ts";

export default function CudyHotspotSection({ routers: _routers }: { routers: RouterConfig[] }) {
  const allRouters = useRouters();
  const bboxRouterId = allRouters?.find((r) => r.type === "bbox")?.name ?? null;
  const { data: cudyData } = useCudyClients();
  const hostnames = useMacHostnames(bboxRouterId);
  const ips = useMacIps(bboxRouterId);

  const flat = (cudyData?.routers ?? [])
    .flatMap((router) =>
      router.wireless.accessPoints.map((ap) => ({ router, ap })),
    )
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
        />
      ))}
    </>
  );
}

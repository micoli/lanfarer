import { AccessPointCard } from "../../../../src/components/AccessPointCard.tsx";
import type { RouterConfig } from "../../../../plugins/frontend-plugin.ts";
import { useBboxWireless } from "../hooks/useBboxWireless.ts";
import { useMacHostnames } from "../hooks/useMacHostnames.ts";
import { useMacIps } from "../hooks/useMacIps.ts";

function BboxRouterSection({ routerId }: { routerId: string }) {
  const { data: bboxWireless } = useBboxWireless(routerId);
  const hostnames = useMacHostnames(routerId);
  const ips = useMacIps(routerId);

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
            routerName={`Bbox — ${ap.ssid}`}
            routerOnline={bboxWireless?.online ?? false}
            hostnames={hostnames}
            ips={ips}
          />
        ))}
    </>
  );
}

export default function BboxHotspotSection({ routers }: { routers: RouterConfig[] }) {
  return (
    <>
      {routers.map((r) => (
        <BboxRouterSection key={r.name} routerId={r.name} />
      ))}
    </>
  );
}

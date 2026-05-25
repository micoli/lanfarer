import { useQuery } from "@tanstack/react-query";
import type { MapTopology } from "../../plugins/contracts.ts";
import { basePath } from "../lib/basePath.ts";

export function useMapTopology() {
  return useQuery<MapTopology>({
    queryKey: ["map", "topology"],
    queryFn: async () => {
      const res = await fetch(`${basePath()}/__map/topology`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<MapTopology>;
    },
    refetchInterval: 30_000,
  });
}

import { useQuery } from "@tanstack/react-query";
import type { HostsData } from "../../plugins/contracts.ts";
import { basePath } from "../lib/basePath.ts";

export function useHosts() {
  return useQuery<HostsData>({
    queryKey: ["hosts"],
    queryFn: async () => {
      const res = await fetch(`${basePath()}/__hosts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json() as Promise<HostsData>;
    },
    refetchInterval: 30_000,
  });
}

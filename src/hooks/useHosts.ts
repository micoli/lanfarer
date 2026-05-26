import { useQuery } from "@tanstack/react-query";
import { basePath } from "../lib/basePath.ts";
import type { HostsData } from "../../plugins/contracts.ts";

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

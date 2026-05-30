import { useQuery } from "@tanstack/react-query";
import { apiClient, apiFetch } from "../lib/api/client.ts";

export function useMapTopology() {
  return useQuery({
    queryKey: ["map", "topology"],
    queryFn: () => apiFetch(apiClient.GET("/__map/topology")),
    refetchInterval: 30_000,
  });
}

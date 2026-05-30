import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { apiClient } from "../lib/api/client.ts";

function ouiPrefix(mac: string): string {
  return mac.toUpperCase().replace(/[^0-9A-F]/g, "");
}

async function fetchVendor(mac: string): Promise<string | null> {
  const { data } = await apiClient.GET("/__oui", { params: { query: { mac } } });
  return data?.vendor ?? null;
}

export function useVendor(mac: string | undefined): string | undefined {
  const oui = mac ? ouiPrefix(mac) : "";
  const { data } = useQuery({
    queryKey: ["oui", oui],
    queryFn: () => fetchVendor(oui),
    enabled: !!oui,
    staleTime: Infinity,
    retry: false,
  });
  return data ?? undefined;
}

export function useVendors(macs: (string | undefined | null)[]): Map<string, string> {
  const prefixes = macs.map((mac) => (mac ? ouiPrefix(mac) : ""));

  const results = useQueries({
    queries: prefixes.map((oui) => ({
      queryKey: ["oui", oui],
      queryFn: () => (oui ? fetchVendor(oui) : Promise.resolve(null)),
      enabled: !!oui,
      staleTime: Infinity,
      retry: false,
    })),
  });

  return useMemo(() => {
    const map = new Map<string, string>();
    macs.forEach((mac, i) => {
      const vendor = results[i]?.data;
      if (mac && vendor) map.set(mac.toLowerCase(), vendor);
    });
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [results]);
}

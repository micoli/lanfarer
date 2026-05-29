import { useQuery } from "@tanstack/react-query";
import { basePath } from "../lib/basePath.ts";

function ouiPrefix(mac: string): string {
  return mac.toUpperCase().replace(/[^0-9A-F]/g, "").slice(0, 6);
}

async function fetchVendor(mac: string): Promise<string | null> {
  const res = await fetch(`${basePath()}/__oui?mac=${encodeURIComponent(mac)}`);
  if (!res.ok) return null;
  const data = (await res.json()) as { vendor?: string | null };
  return data.vendor ?? null;
}

export function useVendor(mac: string | undefined): string | undefined {
  const oui = mac ? ouiPrefix(mac) : "";
  const { data } = useQuery({
    queryKey: ["oui", oui],
    queryFn: () => fetchVendor(oui),
    enabled: oui.length === 6,
    staleTime: Infinity,
    retry: false,
  });
  return data ?? undefined;
}

import { useQuery } from "@tanstack/react-query";

export interface CudyClient {
  mac: string;
  signal_dbm: number;
  band: "2.4G" | "5G";
  ssid: string;
  tx_rate: number;
  rx_rate: number;
  inactive_ms: number;
}

export interface CudyInterface {
  ifname: string;
  ssid: string;
  band: "2.4G" | "5G";
  channel: number;
  bitrate: number;
  clients: CudyClient[];
}

export interface CudyRouter {
  name: string;
  ip: string;
  online: boolean;
  firmware: string;
  uptime: string;
  interfaces: CudyInterface[];
}

async function fetchCudyClients(): Promise<{ routers: CudyRouter[] }> {
  const res = await fetch("/__cudy/clients");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<{ routers: CudyRouter[] }>;
}

export function useCudyClients() {
  return useQuery({
    queryKey: ["cudy", "clients"],
    queryFn: fetchCudyClients,
    refetchInterval: 30_000,
  });
}

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bboxApi } from "../lib/bbox/api";
import type { DhcpClient } from "../lib/bbox/types";

export function useIpCheck() {
  const [checking, setChecking] = useState(false);
  const [conflict, setConflict] = useState<string | null>(null);

  async function check(ip: string, ownMac: string, onCreate: () => void) {
    if (conflict) {
      // User confirmed despite warning — proceed
      onCreate();
      setConflict(null);
      return;
    }
    setChecking(true);
    try {
      const res = await fetch(`/__check-ip?ip=${encodeURIComponent(ip)}`);
      const data = (await res.json()) as { reachable: boolean; mac: string | null };
      if (data.reachable && data.mac && data.mac !== ownMac.toLowerCase()) {
        setConflict(`IP déjà utilisée par ${data.mac}`);
        setChecking(false);
        return;
      }
    } catch { /* ignore network errors on check */ }
    setChecking(false);
    onCreate();
  }

  return { checking, conflict, clearConflict: () => setConflict(null), check };
}

export function useDevice() {
  return useQuery<unknown>({
    queryKey: ["device"],
    queryFn: () => bboxApi.getDevice(),
    refetchInterval: 60_000,
  });
}

export function useWanStats() {
  return useQuery<unknown>({
    queryKey: ["wan", "stats"],
    queryFn: () => bboxApi.getWanStats(),
    refetchInterval: 10_000,
  });
}

export function useWireless() {
  return useQuery<unknown>({
    queryKey: ["wireless"],
    queryFn: () => bboxApi.getWireless(),
  });
}

export function useDhcpConfig() {
  return useQuery<unknown>({
    queryKey: ["dhcp", "config"],
    queryFn: () => bboxApi.getDhcp(),
  });
}

export function useDhcpClients() {
  return useQuery<unknown>({
    queryKey: ["dhcp", "clients"],
    queryFn: () => bboxApi.getDhcpClients(),
  });
}

export function useCreateDhcpClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (client: Omit<DhcpClient, "id">) => bboxApi.createDhcpClient(client),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dhcp", "clients"] }),
  });
}

export function useUpdateDhcpClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...client }: DhcpClient) => bboxApi.updateDhcpClient(id, client),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dhcp", "clients"] }),
  });
}

export function useDeleteDhcpClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => bboxApi.deleteDhcpClient(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dhcp", "clients"] }),
  });
}

export function useUpdateDhcpConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: {
      enable?: number;
      minaddress?: string;
      maxaddress?: string;
      leasetime?: number;
    }) => bboxApi.updateDhcp(config),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dhcp", "config"] }),
  });
}

export function useHosts() {
  return useQuery<unknown>({
    queryKey: ["hosts"],
    queryFn: () => bboxApi.getHosts(),
    refetchInterval: 30_000,
  });
}

export function useDhcpOptions() {
  return useQuery<unknown>({
    queryKey: ["dhcp", "options"],
    queryFn: () => bboxApi.getDhcpOptions(),
  });
}

export function useCreateDhcpOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ option, value }: { option: number; value: string }) =>
      bboxApi.createDhcpOption(option, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dhcp", "options"] }),
  });
}

export function useUpdateDhcpOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, option, value }: { id: number; option: number; value: string }) =>
      bboxApi.updateDhcpOption(id, option, value),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dhcp", "options"] }),
  });
}

export function useDeleteDhcpOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => bboxApi.deleteDhcpOption(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dhcp", "options"] }),
  });
}

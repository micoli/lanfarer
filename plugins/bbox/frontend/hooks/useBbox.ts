import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { bboxApi } from "../api/bbox.ts";
import type { components } from "../../../../src/lib/api/schema.d.ts";
import { serverApi } from "../../../../src/lib/api/server.ts";

type DhcpClient = components["schemas"]["DhcpClient"];

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
      const data = await serverApi.checkIp(ip);
      if (data.reachable && data.mac && data.mac !== ownMac.toLowerCase()) {
        setConflict(`IP déjà utilisée par ${data.mac}`);
        setChecking(false);
        return;
      }
    } catch {
      /* ignore network errors on check */
    }
    setChecking(false);
    onCreate();
  }

  return { checking, conflict, clearConflict: () => setConflict(null), check };
}

export function useDevice(routerId: string | null) {
  return useQuery<unknown>({
    queryKey: ["device", routerId],
    queryFn: () => bboxApi.getDevice(routerId!),
    refetchInterval: 60_000,
    enabled: routerId !== null,
  });
}

export function useWanStats(routerId: string | null) {
  return useQuery<unknown>({
    queryKey: ["wan", "stats", routerId],
    queryFn: () => bboxApi.getWanStats(routerId!),
    refetchInterval: 10_000,
    enabled: routerId !== null,
  });
}

export function useWireless(routerId: string | null) {
  return useQuery<unknown>({
    queryKey: ["wireless", routerId],
    queryFn: () => bboxApi.getWireless(routerId!),
    enabled: routerId !== null,
  });
}

export function useDhcpConfig(routerId: string | null) {
  return useQuery<unknown>({
    queryKey: ["dhcp", routerId, "config"],
    queryFn: () => bboxApi.getDhcp(routerId!),
    enabled: routerId !== null,
  });
}

export function useDhcpClients(routerId: string | null) {
  return useQuery<unknown>({
    queryKey: ["dhcp", routerId, "clients"],
    queryFn: () => bboxApi.getDhcpClients(routerId!),
    enabled: routerId !== null,
  });
}

export function useCreateDhcpClient(routerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (client: Omit<DhcpClient, "id">) => {
      if (!routerId) return Promise.reject(new Error("No DHCP router configured"));
      return bboxApi.createDhcpClient(routerId, client);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dhcp", routerId, "clients"] }),
  });
}

export function useUpdateDhcpClient(routerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...client }: DhcpClient) => {
      if (!routerId) return Promise.reject(new Error("No DHCP router configured"));
      return bboxApi.updateDhcpClient(routerId, id, client);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dhcp", routerId, "clients"] }),
  });
}

export function useDeleteDhcpClient(routerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => {
      if (!routerId) return Promise.reject(new Error("No DHCP router configured"));
      return bboxApi.deleteDhcpClient(routerId, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dhcp", routerId, "clients"] }),
  });
}

export function useUpdateDhcpConfig(routerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (config: {
      enable?: number;
      minaddress?: string;
      maxaddress?: string;
      leasetime?: number;
    }) => {
      if (!routerId) return Promise.reject(new Error("No DHCP router configured"));
      return bboxApi.updateDhcp(routerId, config);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dhcp", routerId, "config"] }),
  });
}

export function useHosts(routerId: string | null) {
  return useQuery<unknown>({
    queryKey: ["hosts", routerId],
    queryFn: () => bboxApi.getHosts(routerId!),
    refetchInterval: 30_000,
    enabled: routerId !== null,
  });
}

export function useDhcpOptions(routerId: string | null) {
  return useQuery<unknown>({
    queryKey: ["dhcp", routerId, "options"],
    queryFn: () => bboxApi.getDhcpOptions(routerId!),
    enabled: routerId !== null,
  });
}

export function useCreateDhcpOption(routerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ option, value }: { option: number; value: string }) => {
      if (!routerId) return Promise.reject(new Error("No DHCP router configured"));
      return bboxApi.createDhcpOption(routerId, option, value);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dhcp", routerId, "options"] }),
  });
}

export function useUpdateDhcpOption(routerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, option, value }: { id: number; option: number; value: string }) => {
      if (!routerId) return Promise.reject(new Error("No DHCP router configured"));
      return bboxApi.updateDhcpOption(routerId, id, option, value);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dhcp", routerId, "options"] }),
  });
}

export function useDeleteDhcpOption(routerId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => {
      if (!routerId) return Promise.reject(new Error("No DHCP router configured"));
      return bboxApi.deleteDhcpOption(routerId, id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dhcp", routerId, "options"] }),
  });
}

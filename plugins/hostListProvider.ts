import type { HostsData } from "./contracts.ts";

export interface HostListProviderResult {
  data: HostsData | undefined;
  isLoading: boolean;
  error: Error | null;
}

export type HostListProvider = (routerId: string | null) => HostListProviderResult;

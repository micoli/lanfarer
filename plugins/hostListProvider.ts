export interface HostListProviderResult {
  data: unknown;
  isLoading: boolean;
  error: Error | null;
}

export type HostListProvider = (routerId: string | null) => HostListProviderResult;

import type { WirelessData } from "../../../contracts.ts";
import { useWireless } from "./useBbox";

export function useBboxWireless(routerId: string | null): { data: WirelessData | undefined; isLoading: boolean } {
  const { data, isLoading } = useWireless(routerId);
  return { data, isLoading };
}

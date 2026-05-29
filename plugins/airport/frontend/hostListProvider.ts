import type { HostListProvider } from "../../hostListProvider.ts";
import { useAirportHosts } from "./hooks/useAirport.ts";

export const hostListProvider: HostListProvider = useAirportHosts;

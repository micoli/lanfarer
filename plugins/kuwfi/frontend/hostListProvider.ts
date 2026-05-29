import type { HostListProvider } from "../../hostListProvider.ts";
import { useKuwfiHosts } from "./hooks/useKuwfi.ts";

export const hostListProvider: HostListProvider = useKuwfiHosts;

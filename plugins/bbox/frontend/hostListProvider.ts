import type { HostListProvider } from "../../hostListProvider.ts";
import { useHosts } from "./hooks/useBbox.ts";

export const hostListProvider: HostListProvider = useHosts;

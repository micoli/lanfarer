import type { HostListProvider } from "../../hostListProvider.ts";
import { useCudyHosts } from "./hooks/useCudy.ts";

export const hostListProvider: HostListProvider = useCudyHosts;

import { frontendPlugins } from "./frontendPlugins.ts";
import type { HostListProvider } from "./hostListProvider.ts";

export const hostListProviders: HostListProvider[] = frontendPlugins
  .map((p) => p.hostListProvider)
  .filter((p): p is HostListProvider => typeof p === "function");

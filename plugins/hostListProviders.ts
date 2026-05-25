import type { HostListProvider } from "./hostListProvider.ts";

const modules = import.meta.glob<{ hostListProvider: HostListProvider }>(
  "./*/frontend/hostListProvider.ts",
  { eager: true },
);

export const hostListProviders: HostListProvider[] = Object.values(modules)
  .map((m) => m.hostListProvider)
  .filter((p): p is HostListProvider => typeof p === "function");

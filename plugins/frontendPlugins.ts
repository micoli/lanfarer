import type { FrontendPlugin } from "./frontend-plugin.ts";

const modules = import.meta.glob<{ plugin: FrontendPlugin }>("./*/frontend/index.ts", {
  eager: true,
});

export const frontendPlugins: FrontendPlugin[] = Object.values(modules)
  .map((m) => m.plugin)
  .filter((p): p is FrontendPlugin => p != null);

import type { FrontendPlugin } from "../../plugins/frontend-plugin.ts";
import { frontendPlugins } from "../../plugins/frontendPlugins.ts";
import { useRouters } from "./useUiConfig.ts";

export function useActivePlugins(): FrontendPlugin[] {
  const routers = useRouters();
  if (!routers) return [];
  const activeTypes = new Set(routers.map((r) => r.type));
  return frontendPlugins.filter((p) => activeTypes.has(p.type));
}

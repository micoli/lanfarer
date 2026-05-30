import fs from "node:fs";
import path from "node:path";
import type { RouterPlugin } from "./plugin.ts";

export async function loadPlugins(): Promise<RouterPlugin[]> {
  const pluginsDir = path.resolve("plugins");
  if (!fs.existsSync(pluginsDir)) return [];
  const plugins: RouterPlugin[] = [];
  for (const name of fs.readdirSync(pluginsDir).sort()) {
    const entry = path.join(pluginsDir, name, "server", "index.ts");
    if (!fs.existsSync(entry)) continue;
    try {
      const mod = (await import(entry)) as { plugin?: RouterPlugin };
      if (mod.plugin) {
        plugins.push(mod.plugin);
        console.log(`[plugins] loaded: ${name}`);
      }
    } catch (err) {
      console.warn(`[plugins] failed to load ${name}:`, err);
    }
  }
  return plugins;
}

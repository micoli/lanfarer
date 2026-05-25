import { useQuery } from "@tanstack/react-query";
import { basePath } from "../lib/basePath.ts";

export interface MenuItemConfig {
  id: string;
  router?: string;
  children?: MenuItemConfig[];
}

export interface WidgetConfig {
  type: string;
  id: string;
}

export interface UiConfig {
  menu: MenuItemConfig[] | null;
  home: { widgets: WidgetConfig[] } | null;
}

const DEFAULT_CONFIG: UiConfig = { menu: null, home: null };

async function fetchUiConfig(): Promise<UiConfig> {
  const res = await fetch(`${basePath()}/__config/ui`);
  if (!res.ok) return DEFAULT_CONFIG;
  return (await res.json()) as UiConfig;
}

export function useUiConfig(): UiConfig {
  const { data } = useQuery({
    queryKey: ["ui-config"],
    queryFn: fetchUiConfig,
    staleTime: Infinity,
    retry: false,
  });
  return data ?? DEFAULT_CONFIG;
}

function findInMenu(items: MenuItemConfig[], pageId: string): MenuItemConfig | undefined {
  for (const item of items) {
    if (item.id === pageId) return item;
    if (item.children) {
      const found = findInMenu(item.children, pageId);
      if (found) return found;
    }
  }
  return undefined;
}

export function useRouterForPage(pageId: string): string | null {
  const config = useUiConfig();
  if (!config.menu) return null;
  return findInMenu(config.menu, pageId)?.router ?? null;
}

export function useDhcpRouterId(): string | null {
  const config = useUiConfig();
  if (!config.menu) return null;
  const item = findInMenu(config.menu, "dhcp-options") ?? findInMenu(config.menu, "dhcp-reservations");
  return item?.router ?? null;
}

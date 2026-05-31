import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api/client.ts";

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
  dhcp: { router: string } | null;
}

const DEFAULT_CONFIG: UiConfig = { menu: null, home: null, dhcp: null };

export function useUiConfig(): UiConfig {
  const { data } = useQuery({
    queryKey: ["ui-config"],
    queryFn: async () => {
      const { data } = await apiClient.GET("/__config/ui");
      return (data as UiConfig | undefined) ?? DEFAULT_CONFIG;
    },
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

export function useRouters(): { name: string; type: string; ip?: string }[] | undefined {
  const { data } = useQuery({
    queryKey: ["config", "routers"],
    queryFn: async () => {
      const { data } = await apiClient.GET("/__config/routers");
      return data ?? [];
    },
    staleTime: Infinity,
    retry: false,
  });
  return data;
}

export function useRouterType(routerId: string | null): string | null {
  const data = useRouters();
  if (!routerId || !data) return null;
  return data.find((r) => r.name === routerId)?.type ?? null;
}

export function useDhcpRouterId(): string | null {
  const config = useUiConfig();
  if (config.dhcp?.router) return config.dhcp.router;
  if (!config.menu) return null;
  const item =
    findInMenu(config.menu, "dhcp-options") ?? findInMenu(config.menu, "dhcp-reservations");
  return item?.router ?? null;
}

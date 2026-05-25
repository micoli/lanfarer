import { useQuery } from "@tanstack/react-query";
import { basePath } from "../lib/basePath.ts";

export interface MenuItemConfig {
  id: string;
  router?: string;
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

export function useRouterForPage(pageId: string): string | null {
  const config = useUiConfig();
  if (!config.menu) return null;
  const item = config.menu.find((m) => m.id === pageId);
  return item?.router ?? null;
}

export function useDhcpRouterId(): string | null {
  const config = useUiConfig();
  if (!config.menu) return null;
  const dhcpItem = config.menu.find((m) => m.id === "dhcp-options" || m.id === "dhcp-reservations");
  return dhcpItem?.router ?? null;
}

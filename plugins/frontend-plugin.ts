import type { LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import type { HostListProvider } from "./hostListProvider.ts";

export interface PluginRoute {
  path: string;
  component: ComponentType;
}

export interface NavItemDescriptor {
  id: string;
  icon: LucideIcon;
  labelKey: string;
  end?: boolean;
  path: string | ((routerId: string) => string);
}

export interface WidgetDescriptor {
  type: string;
  component: ComponentType<{ routerId: string }>;
}

export interface RouterConfig {
  name: string;
  type: string;
}

export interface FrontendPlugin {
  readonly type: string;
  hostListProvider?: HostListProvider;
  routes?: PluginRoute[];
  navItems?: NavItemDescriptor[];
  hotspotSection?: ComponentType<{ routers: RouterConfig[] }>;
  wifiSection?: ComponentType;
  bandwidthCard?: ComponentType<{ routerName: string }>;
  widgets?: WidgetDescriptor[];
}

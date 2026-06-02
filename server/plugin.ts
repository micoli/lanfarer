import type http from "node:http";
import type { HostsData, MapAccessPoint } from "../plugins/contracts.ts";

export interface PluginRoute {
  method: string;
  subpath: string; // relative to /devices/api-proxy/{type}/, use {routerId} as placeholder
  params?: string[]; // query params (GET) or body fields (POST/PUT)
}

export interface RouterPlugin {
  readonly type: string;
  readonly routes?: PluginRoute[];
  matches(url: string): boolean;
  handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void>;
  fetchHostnames?(): Promise<Map<string, string>>;
  fetchHosts?(): Promise<HostsData>;
  fetchTopologySegments?(hostnameMap: Map<string, string>, ipMap: Map<string, string>): Promise<MapAccessPoint[]>;
}

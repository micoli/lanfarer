import type http from "node:http";
import type { HostsData, MapAccessPoint } from "../plugins/contracts.ts";

export interface RouterPlugin {
  readonly type: string;
  matches(url: string): boolean;
  handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void>;
  fetchHostnames?(): Promise<Map<string, string>>;
  fetchHosts?(): Promise<HostsData>;
  fetchTopologySegments?(hostnameMap: Map<string, string>, ipMap: Map<string, string>): Promise<MapAccessPoint[]>;
}

import type http from "node:http";
import type { MapAccessPoint } from "../plugins/contracts.ts";

export interface RouterPlugin {
  readonly type: string;
  matches(url: string): boolean;
  handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void>;
  fetchHostnames?(): Promise<Map<string, string>>;
  fetchTopologySegments?(hostnameMap: Map<string, string>): Promise<MapAccessPoint[]>;
}

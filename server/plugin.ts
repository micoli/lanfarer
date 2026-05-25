import type http from "node:http";

export interface RouterPlugin {
  readonly type: string;
  matches(url: string): boolean;
  handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void>;
}

import http from "node:http";
import { detectSubnet, runScan } from "../network-scan.ts";

export async function handleScan(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const params = new URL(req.url ?? "/", "http://localhost").searchParams;
  const subnet = params.get("subnet") ?? detectSubnet();
  const ac = new AbortController();

  res.writeHead(200, {
    "content-type":  "text/event-stream",
    "cache-control": "no-cache",
    connection:      "keep-alive",
  });

  const send = (event: string, data: string) => {
    if (!res.writableEnded) res.write(`event: ${event}\ndata: ${data}\n\n`);
  };

  req.on("close", () => ac.abort());

  runScan(subnet, send, ac.signal)
    .then(() => send("done", "{}"))
    .catch((err) => send("error", JSON.stringify({ message: (err as Error).message })))
    .finally(() => res.end());
}

import { exec } from "node:child_process";
import { promisify } from "node:util";
import type http from "node:http";

const execAsync = promisify(exec);
const MAX_IPS = 20;
const INTERVAL_MS = 3000;

export async function pingOnce(ip: string): Promise<number | null> {
  try {
    const timeoutFlag = process.platform === "darwin" ? "-t" : "-W";
    const { stdout } = await execAsync(`ping -c 1 ${timeoutFlag} 2 "${ip}"`, { timeout: 4000 });
    const m = stdout.match(/time=([\d.]+)/);
    if (m) return parseFloat(m[1]);
  } catch {}
  return null;
}

export async function handlePing(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? "", "http://localhost");
  const ipsParam = url.searchParams.get("ips") ?? "";
  const ips = ipsParam
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);

  if (ips.length === 0) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "No IPs provided" }));
    return;
  }

  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
    "x-accel-buffering": "no",
  });

  let stopped = false;
  let sliceOffset = 0;
  req.on("close", () => {
    stopped = true;
  });

  while (!stopped && !res.writableEnded) {
    const batch = ips.slice(sliceOffset, sliceOffset + MAX_IPS);
    sliceOffset = (sliceOffset + MAX_IPS) % ips.length;
    const results = await Promise.all(batch.map(async (ip) => ({ ip, rtt: await pingOnce(ip) })));
    if (!stopped && !res.writableEnded) {
      res.write(`event: ping\ndata: ${JSON.stringify(results)}\n\n`);
    }
    if (stopped || res.writableEnded) break;
    await new Promise<void>((resolve) => setTimeout(resolve, INTERVAL_MS));
  }

  if (!res.writableEnded) res.end();
}

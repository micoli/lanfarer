import http from "node:http";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function handleCheckIp(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const ip = new URL(req.url ?? "/", "http://localhost").searchParams.get("ip") ?? "";
  if (!/^\d{1,3}(?:\.\d{1,3}){3}$/.test(ip)) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Invalid IP" }));
    return;
  }
  let reachable = false;
  let mac: string | null = null;
  try {
    await execAsync(`ping -c 1 "${ip}"`, { timeout: 2000 });
    reachable = true;
  } catch { /* unreachable */ }
  if (reachable) {
    try {
      const { stdout } = await execAsync(`arp -n "${ip}"`);
      const m = stdout.match(/([0-9a-f]{1,2}(?::[0-9a-f]{1,2}){5})/i);
      if (m) mac = m[1].toLowerCase();
    } catch { /* arp unavailable */ }
  }
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({ reachable, mac }));
}

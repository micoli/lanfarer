import os from "node:os";
import net from "node:net";
import dns from "node:dns/promises";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { loadVendorDb, lookupVendor } from "./mac-vendor.ts";
import { probeHostDetails } from "./host-probe.ts";

const execAsync = promisify(exec);

// Whether ping failed due to missing CAP_NET_RAW (Docker without raw socket capability).
let pingPermissionDenied = false;

function tcpProbe(ip: string, port: number, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const s = new net.Socket();
    const t = setTimeout(() => { s.destroy(); resolve(false); }, timeoutMs);
    s.connect(port, ip, () => { clearTimeout(t); s.destroy(); resolve(true); });
    s.on("error", () => { clearTimeout(t); resolve(false); });
  });
}

// Returns true if the host responds to ping or, in Docker (no CAP_NET_RAW), to any TCP probe.
async function isAlive(ip: string): Promise<boolean> {
  if (!pingPermissionDenied) {
    try {
      await execAsync(`ping -c 1 -W 1 "${ip}"`, { timeout: 2000 });
      return true;
    } catch (err) {
      const msg = String((err as { stderr?: string }).stderr ?? err);
      if (msg.includes("Operation not permitted") || msg.includes("permission")) {
        if (!pingPermissionDenied) {
          console.warn("[scan] ping: Operation not permitted — falling back to TCP probing (no CAP_NET_RAW in this container)");
          pingPermissionDenied = true;
        }
      } else {
        return false;
      }
    }
  }
  // TCP fallback: try a handful of common ports
  const results = await Promise.all([80, 443, 22, 8080, 445].map((p) => tcpProbe(ip, p)));
  return results.some(Boolean);
}

export function detectSubnet(): string {
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const addr of ifaces ?? []) {
      if (addr.family === "IPv4" && !addr.internal) {
        const p = addr.address.split(".");
        return `${p[0]}.${p[1]}.${p[2]}.0/24`;
      }
    }
  }
  return "192.168.1.0/24";
}

export function cidrToIps(cidr: string): string[] {
  const [base] = cidr.split("/");
  const p = base.split(".").map(Number);
  return Array.from({ length: 254 }, (_, i) => `${p[0]}.${p[1]}.${p[2]}.${i + 1}`);
}

async function scanIp(ip: string): Promise<{ mac: string; hostname: string } | null> {
  if (!(await isAlive(ip))) return null;

  let mac = "";
  try {
    const { stdout } = await execAsync(`arp -n "${ip}"`);
    const m = stdout.match(/([0-9a-f]{1,2}(?::[0-9a-f]{1,2}){5})/i);
    if (m) mac = m[1].toLowerCase();
  } catch (err) {
    console.debug(`[scan] arp ${ip}: ${(err as Error).message}`);
  }
  let hostname = "";
  try {
    const names = await dns.reverse(ip);
    hostname = names[0] ?? "";
  } catch {}
  return { mac, hostname };
}

export async function runScan(
  subnet: string,
  send: (event: string, data: string) => void,
  signal: AbortSignal,
): Promise<void> {
  await loadVendorDb();
  const ips = cidrToIps(subnet);
  const total = ips.length;
  let done = 0;
  const detailPromises: Promise<void>[] = [];

  await Promise.all(
    Array.from({ length: 10 }, async (_, worker) => {
      for (let i = worker; i < ips.length; i += 10) {
        if (signal.aborted) return;
        const ip = ips[i];
        const result = await scanIp(ip);
        done++;
        send("progress", JSON.stringify({ done, total }));
        if (result !== null) {
          send("host", JSON.stringify({
            ip,
            mac: result.mac,
            hostname: result.hostname,
            vendor: result.mac ? lookupVendor(result.mac) : "",
            ping: true,
          }));
          detailPromises.push(
            probeHostDetails(ip, result.hostname)
              .then((detail) => { if (!signal.aborted) send("host-detail", JSON.stringify(detail)); })
              .catch(() => {}),
          );
        }
      }
    }),
  );

  await Promise.all(detailPromises);
}

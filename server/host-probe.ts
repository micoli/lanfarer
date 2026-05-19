import net from "node:net";
import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export interface HostDetail {
  ip: string;
  pingStats: { min: number; avg: number; max: number } | null;
  openPorts: number[];
  mdnsName: string;
  smbName: string;
  smbDomain: string;
}

const COMMON_PORTS: Record<number, string> = {
  21: "FTP", 22: "SSH", 23: "Telnet", 25: "SMTP",
  80: "HTTP", 443: "HTTPS", 445: "SMB", 3389: "RDP",
  5900: "VNC", 8080: "HTTP-alt", 8443: "HTTPS-alt",
};

function checkPort(ip: string, port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const s = new net.Socket();
    const t = setTimeout(() => { s.destroy(); resolve(false); }, 800);
    s.connect(port, ip, () => { clearTimeout(t); s.destroy(); resolve(true); });
    s.on("error", () => { clearTimeout(t); resolve(false); });
  });
}

async function scanPorts(ip: string): Promise<number[]> {
  const results = await Promise.all(
    Object.keys(COMMON_PORTS).map(async (p) => {
      const port = Number(p);
      return (await checkPort(ip, port)) ? port : null;
    }),
  );
  return results.filter((p): p is number => p !== null).sort((a, b) => a - b);
}

async function getPingStats(ip: string): Promise<{ min: number; avg: number; max: number } | null> {
  try {
    const { stdout } = await execAsync(`ping -c 3 -i 0.2 "${ip}"`, { timeout: 5000 });
    const m = stdout.match(/(?:round-trip|rtt) min\/avg\/max\/\S+ = ([\d.]+)\/([\d.]+)\/([\d.]+)/);
    if (m) return { min: parseFloat(m[1]), avg: parseFloat(m[2]), max: parseFloat(m[3]) };
  } catch {}
  return null;
}

async function getMdnsName(ip: string, hostname: string): Promise<string> {
  if (hostname.toLowerCase().endsWith(".local")) return hostname;
  try {
    const { stdout } = await execAsync(`avahi-resolve-address "${ip}"`, { timeout: 2000 });
    const m = stdout.match(/\S+\s+(\S+)/);
    if (m?.[1]) return m[1].replace(/\.$/, "");
  } catch {}
  return "";
}

async function getSmbInfo(ip: string): Promise<{ name: string; domain: string } | null> {
  try {
    const { stdout } = await execAsync(`smbutil status "${ip}"`, { timeout: 3000 });
    const name   = stdout.match(/Server:\s*(.+)/i)?.[1]?.trim() ?? "";
    const domain = stdout.match(/Workgroup:\s*(.+)/i)?.[1]?.trim() ?? "";
    if (name) return { name, domain };
  } catch {}
  try {
    const { stdout } = await execAsync(`nmblookup -A "${ip}"`, { timeout: 3000 });
    let name = ""; let domain = "";
    for (const line of stdout.split("\n")) {
      const m = line.match(/\s+(\S+)\s+<([0-9a-f]{2})>/i);
      if (!m) continue;
      if (m[2] === "00" && !name) name = m[1].trim();
      if ((m[2] === "1e" || m[2] === "00") && !domain) domain = m[1].trim();
    }
    if (name) return { name, domain };
  } catch {}
  return null;
}

export async function probeHostDetails(ip: string, hostname: string): Promise<HostDetail> {
  const [pingStats, openPorts, mdnsName, smbInfo] = await Promise.all([
    getPingStats(ip),
    scanPorts(ip),
    getMdnsName(ip, hostname),
    getSmbInfo(ip),
  ]);
  return {
    ip, pingStats, openPorts,
    mdnsName,
    smbName:   smbInfo?.name   ?? "",
    smbDomain: smbInfo?.domain ?? "",
  };
}

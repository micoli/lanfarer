import net from "node:net";

const PORT = 5009;
const MAGIC = Buffer.from("acpp");
const VERSION = 0x00030001; // version=3, type=1

function adler32(buf: Buffer): number {
  let s1 = 1;
  let s2 = 0;
  for (const b of buf) {
    s1 = (s1 + b) % 65521;
    s2 = (s2 + s1) % 65521;
  }
  return (s2 << 16) | s1;
}

function buildClientHello(): Buffer {
  const pkt = Buffer.alloc(128);
  MAGIC.copy(pkt, 0);
  pkt.writeUInt16BE(3, 4);      // version
  pkt.writeUInt16BE(0x0000, 6); // client-hello
  pkt.writeUInt32BE(1, 12);     // seq=1
  return pkt;
}

function buildCommand(cmd: number, body = Buffer.alloc(0)): Buffer {
  const bodyChk = body.length === 0 ? 1 : adler32(body);
  const hdr = Buffer.alloc(28);
  MAGIC.copy(hdr, 0);
  hdr.writeUInt32BE(VERSION, 4);
  hdr.writeUInt16BE(cmd, 8);
  hdr.writeUInt16BE(0, 10);     // flags
  hdr.writeUInt32BE(0, 12);     // err
  hdr.writeUInt32BE(body.length, 16);
  hdr.writeUInt32BE(bodyChk, 20);
  hdr.writeUInt32BE(adler32(hdr), 24);
  return Buffer.concat([hdr, body]);
}

function parseResponse(buf: Buffer): { cmd: number; err: number; bsz: number; body: Buffer } | null {
  if (buf.length < 28) return null;
  const cmd = buf.readUInt16BE(8);
  const err = buf.readInt32BE(12);
  const bsz = buf.readUInt32BE(16);
  const body = buf.subarray(28, 28 + bsz);
  return { cmd, err, bsz, body };
}

// ── Binary property-list parser for ACP CFB0 format ──────────────────────────

export interface AcpDeviceInfo {
  laMA?: string; // LAN MAC
  raMA?: string; // Radio/WAN MAC
  waMA?: string; // Wireless AP MAC
  features?: string[];
}

function parseCFB0(buf: Buffer): Record<string, string | string[]> {
  // ACP uses a simple TLV-like format: type byte + null-terminated strings
  // type 0xd0 = dict, 0x70 = string value (prefixed with 'p')
  const result: Record<string, string | string[]> = {};
  let i = 0;
  let currentKey: string | null = null;
  const values: string[] = [];

  while (i < buf.length) {
    const b = buf[i];
    if (b === 0xd0) {
      // Start of dict/array
      i++;
    } else if (b === 0x70) {
      // String (p-prefixed)
      i++;
      const end = buf.indexOf(0, i);
      if (end < 0) break;
      const s = buf.subarray(i, end).toString("utf8");
      i = end + 1;
      if (currentKey === null) {
        currentKey = s;
      } else {
        values.push(s);
        if (currentKey && !s.startsWith("p") && values.length === 1) {
          result[currentKey] = s;
          currentKey = null;
          values.length = 0;
        }
      }
    } else if (b === 0x00) {
      // End of value/section
      if (currentKey && values.length > 0) {
        result[currentKey] = values.length === 1 ? values[0] : [...values];
        currentKey = null;
        values.length = 0;
      }
      i++;
    } else {
      i++;
    }
  }

  return result;
}

function parseFeaturesPayload(body: Buffer): AcpDeviceInfo {
  if (body.length < 4) return {};

  // Skip 4-byte header (CFB0 magic)
  const props = parseCFB0(body.subarray(4));

  const featureList: string[] = [];
  for (const k of Object.keys(props)) {
    if (k === "features" || k === "featur") continue;
    if (k === "acpProperties") continue;
    if (k === "problems") continue;
    if (k === "laMA" || k === "raMA" || k === "waMA") continue;
    // Features are the 4-char keys that aren't MAC/property names
    if (k.length <= 4 && /^[a-zA-Z0-9!]+$/.test(k)) featureList.push(k);
  }

  return {
    laMA: typeof props["laMA"] === "string" ? props["laMA"] : undefined,
    raMA: typeof props["raMA"] === "string" ? props["raMA"] : undefined,
    waMA: typeof props["waMA"] === "string" ? props["waMA"] : undefined,
    features: featureList.length > 0 ? featureList : undefined,
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function checkAcpOnline(host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(3000);

    socket.on("error", () => resolve(false));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(false);
    });

    socket.connect(PORT, host, () => {
      const hello = buildClientHello();
      socket.write(hello);

      let buf = Buffer.alloc(0);
      socket.on("data", (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk]);
        if (buf.length >= 8 && buf.subarray(0, 4).equals(MAGIC)) {
          socket.destroy();
          resolve(true);
        }
      });

      socket.on("close", () => resolve(buf.length > 0));
    });
  });
}

export async function fetchAcpDeviceInfo(host: string): Promise<AcpDeviceInfo | null> {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);
    let stage: "hello" | "features" = "hello";
    let buf = Buffer.alloc(0);

    socket.on("error", () => resolve(null));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });

    socket.connect(PORT, host, () => {
      socket.write(buildClientHello());
    });

    socket.on("data", (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);

      if (stage === "hello" && buf.length >= 128) {
        stage = "features";
        buf = Buffer.alloc(0);
        socket.write(buildCommand(0x1b));
        return;
      }

      if (stage === "features" && buf.length >= 28) {
        const parsed = parseResponse(buf);
        socket.destroy();
        if (parsed && parsed.err === 0 && parsed.bsz > 0) {
          resolve(parseFeaturesPayload(parsed.body));
        } else {
          resolve(null);
        }
      }
    });

    socket.on("close", () => resolve(null));
  });
}

// Legacy probe for debugging
export interface AcpExchange {
  step: string;
  hex: string;
}

export async function acpProbe(host: string): Promise<AcpExchange[]> {
  const results: AcpExchange[] = [];

  const result = await new Promise<AcpExchange | null>((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(5000);

    socket.on("error", (e) => resolve({ step: "connect-error", hex: e.message }));
    socket.on("timeout", () => {
      socket.destroy();
      resolve(null);
    });

    socket.connect(PORT, host, () => {
      socket.write(buildClientHello());

      let buf = Buffer.alloc(0);
      let gotHello = false;

      socket.on("data", (chunk: Buffer) => {
        buf = Buffer.concat([buf, chunk]);

        if (!gotHello && buf.length >= 128) {
          gotHello = true;
          const type = buf.readUInt16BE(6);
          const sessionId = buf.subarray(8, 12).toString("hex");
          const serverNonce = buf.subarray(32, 36).toString("hex");
          results.push({
            step: `server-hello type=0x${type.toString(16)} session=${sessionId} nonce=${serverNonce}`,
            hex: buf.subarray(0, 128).toString("hex"),
          });
          // Now send Features command
          buf = Buffer.alloc(0);
          socket.write(buildCommand(0x1b));
        } else if (gotHello) {
          // Collecting features response
        }
      });

      socket.on("close", () => {
        if (gotHello && buf.length > 0) {
          const parsed = parseResponse(buf);
          if (parsed) {
            results.push({
              step: `features cmd=0x${parsed.cmd.toString(16)} err=${parsed.err} bsz=${parsed.bsz}`,
              hex: buf.toString("hex"),
            });
          }
        }
        resolve(results.length > 0 ? results[results.length - 1] : null);
      });
    });
  });

  if (result && !results.includes(result)) results.push(result);
  return results;
}

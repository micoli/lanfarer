/**
 * ACP (Apple Configuration Protocol) client for AirPort base stations.
 *
 * Derived from node-acp <https://gitlab.fancy.org.uk/samuel/node-acp>
 * by Samuel Elliott — MIT License.
 */

import * as net from "node:net";
import * as crypto from "node:crypto";
import { SRP, SrpClient } from "fast-srp-hap";

// ── Adler-32 ──────────────────────────────────────────────────────────────────

function adler32(buf: Buffer): number {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) {
    a = (a + buf[i]) % 65521;
    b = (b + a) % 65521;
  }
  return ((b << 16) | a) >>> 0;
}

// ── ACP keystream & header key ────────────────────────────────────────────────

const ACP_STATIC_KEY = Buffer.from("5b6faf5d9d5b0e1351f2da1de7e8d673", "hex");

function generateACPKeystream(length: number): Buffer {
  const key = Buffer.alloc(length);
  for (let i = 0; i < length; i++) {
    key[i] = ((i + 0x55) & 0xff) ^ ACP_STATIC_KEY[i % ACP_STATIC_KEY.length];
  }
  return key;
}

function generateACPHeaderKey(password: string): Buffer {
  const LEN = 32;
  const ks = generateACPKeystream(LEN);
  const pw = password.substring(0, LEN).padEnd(LEN, "\x00");
  const out = Buffer.alloc(LEN);
  for (let i = 0; i < LEN; i++) out[i] = ks[i] ^ pw.charCodeAt(i);
  return out;
}

// ── CFLBinaryPList ────────────────────────────────────────────────────────────

const CFB_HEADER = "CFB0";
const CFB_FOOTER = "END!";

function cfbCompose(object: unknown): Buffer {
  return Buffer.concat([
    Buffer.from(CFB_HEADER, "binary"),
    cfbPackObject(object),
    Buffer.from(CFB_FOOTER, "binary"),
  ]);
}

function cfbPackObject(obj: unknown, depth = 1): Buffer {
  if (obj === undefined || obj === null) return Buffer.from([0x00]);
  if (typeof obj === "boolean") return Buffer.from([obj ? 0x09 : 0x08]);
  if (typeof obj === "number" && obj % 1 !== 0) {
    const buf = Buffer.alloc(8);
    buf.writeDoubleBE(obj, 0);
    return Buffer.concat([Buffer.from([0x23]), buf]);
  }
  if (typeof obj === "number") {
    for (const size of [1, 2, 4] as const) {
      try {
        const buf = Buffer.alloc(size);
        buf.writeUIntBE(obj, 0, size);
        return Buffer.concat([Buffer.from([0x10 + Math.log2(size)]), buf]);
      } catch { /* try next size */ }
    }
    throw new Error("Unsupported int size");
  }
  if (typeof obj === "bigint") {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64BE(obj, 0);
    return Buffer.concat([Buffer.from([0x13]), buf]);
  }
  if (Buffer.isBuffer(obj)) {
    return Buffer.concat([
      obj.length >= 0xf
        ? Buffer.concat([Buffer.from([0x4f]), cfbPackObject(obj.length, depth + 1)])
        : Buffer.from([0x40 + obj.length]),
      obj,
    ]);
  }
  if (typeof obj === "string") {
    return Buffer.concat([Buffer.from([0x70]), Buffer.from(obj, "utf-8"), Buffer.from([0x00])]);
  }
  if (Array.isArray(obj) || obj instanceof Set) {
    const parts = [...(obj as Iterable<unknown>)].map((el) => cfbPackObject(el, depth + 1));
    return Buffer.concat([Buffer.from([0xa0]), ...parts, Buffer.from([0x00])]);
  }
  if (obj instanceof Map) {
    const parts: Buffer[] = [];
    for (const [k, v] of obj.entries()) {
      parts.push(cfbPackObject(k, depth + 1), cfbPackObject(v, depth + 1));
    }
    return Buffer.concat([Buffer.from([0xd0]), ...parts, Buffer.from([0x00])]);
  }
  if (typeof obj === "object") {
    const parts: Buffer[] = [];
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      parts.push(cfbPackObject(k, depth + 1), cfbPackObject(v, depth + 1));
    }
    return Buffer.concat([Buffer.from([0xd0]), ...parts, Buffer.from([0x00])]);
  }
  throw new Error("cfbPackObject: unsupported type");
}

function cfbParse(data: Buffer): unknown {
  if (data.length < CFB_HEADER.length + CFB_FOOTER.length + 1)
    throw new Error("cfbParse: not enough data");
  if (data.slice(0, 4).toString("binary") !== CFB_HEADER)
    throw new Error("cfbParse: bad header magic");
  const [obj, remaining] = cfbUnpackObject(data.slice(4));
  if (remaining.toString("binary") !== CFB_FOOTER)
    throw new Error("cfbParse: bad footer magic");
  return obj;
}

function cfbUnpackObject(data: Buffer, depth = 1): [unknown, Buffer] {
  if (depth > 10) throw new Error("cfbUnpackObject: max depth");
  const marker = data[0];
  data = data.slice(1);
  const type = marker & 0xf0;
  const info = marker & 0x0f;

  if (type === 0x00) {
    if (info === 0x00) return [null, data];
    if (info === 0x08) return [false, data];
    if (info === 0x09) return [true, data];
    throw new Error("cfbUnpackObject: unknown null/bool info " + info);
  }
  if (type === 0x10) {
    const size = 2 ** info;
    const val = size === 8 ? data.readBigUInt64BE(0) : data.readUIntBE(0, size);
    return [val, data.slice(size)];
  }
  if (type === 0x20) {
    const size = 2 ** info;
    const val = size === 4 ? data.readFloatBE(0) : data.readDoubleBE(0);
    return [val, data.slice(size)];
  }
  if (type === 0x40) {
    const [size, rest] = cfbUnpackCount(info, data);
    return [rest.slice(0, size), rest.slice(size)];
  }
  if (type === 0x70) {
    const end = data.indexOf(0x00);
    return [data.slice(0, end).toString("utf-8"), data.slice(end + 1)];
  }
  if (type === 0xa0) {
    const arr: unknown[] = [];
    while (true) {
      const [el, rest] = cfbUnpackObject(data, depth + 1);
      data = rest;
      if (el === null) break;
      arr.push(el);
    }
    return [arr, data];
  }
  if (type === 0xd0) {
    const obj: Record<string, unknown> = {};
    while (true) {
      const [key, r1] = cfbUnpackObject(data, depth + 1);
      data = r1;
      if (key === null) break;
      const [val, r2] = cfbUnpackObject(data, depth + 1);
      data = r2;
      obj[key as string] = val;
    }
    return [obj, data];
  }
  throw new Error("cfbUnpackObject: unsupported type 0x" + type.toString(16));
}

function cfbUnpackCount(info: number, data: Buffer): [number, Buffer] {
  if (info !== 0x0f) return [info, data];
  const marker = data[0];
  data = data.slice(1);
  const countInfo = marker & 0x0f;
  const size = 2 ** countInfo;
  const count = data.readUIntBE(0, size) as number;
  return [count, data.slice(size)];
}

// ── ACP message framing (128-byte headers) ────────────────────────────────────
//
// Header layout (128 bytes):
//   [0-3]   "acpp" magic
//   [4-7]   version (int32, 0x00030001)
//   [8-11]  header_checksum (uint32, adler32 of header with checksum=0)
//   [12-15] body_checksum (uint32, adler32 of body, or 1 if no body)
//   [16-19] body_size (int32, -1 signals streaming response)
//   [20-23] flags (int32)
//   [24-27] unused (int32, 0)
//   [28-31] command (int32)
//   [32-35] error_code (int32)
//   [36-47] pad1 (12 bytes, zeros)
//   [48-79] key (32 bytes)
//   [80-127] pad2 (48 bytes, zeros)

const HEADER_SIZE = 128;
const ELEMENT_HEADER_SIZE = 12;
const ACP_MAGIC = "acpp";
const ACP_VERSION = 0x00030001;
const ACP_PORT = 5009;
const TIMEOUT_MS = 8000;

const enum Cmd {
  GET_PROPERTY = 0x14,
  AUTHENTICATE = 0x1a,
}

function packHeader(
  cmd: number,
  flags: number,
  errorCode: number,
  bodyChecksum: number,
  bodySize: number,
  key: Buffer,
  headerChecksum = 0,
): Buffer {
  const buf = Buffer.alloc(HEADER_SIZE);
  buf.write(ACP_MAGIC, 0, 4, "binary");
  buf.writeInt32BE(ACP_VERSION, 4);
  buf.writeUInt32BE(headerChecksum, 8);
  buf.writeUInt32BE(bodyChecksum, 12);
  buf.writeInt32BE(bodySize, 16);
  buf.writeInt32BE(flags, 20);
  buf.writeInt32BE(0, 24);
  buf.writeInt32BE(cmd, 28);
  buf.writeInt32BE(errorCode, 32);
  key.copy(buf, 48);
  return buf;
}

function buildMessage(cmd: number, flags: number, key: Buffer, body?: Buffer): Buffer {
  const bodyBuf = body ?? Buffer.alloc(0);
  const bodyChecksum = bodyBuf.length > 0 ? adler32(bodyBuf) : 1;
  const bodySize = bodyBuf.length;
  const tmpHdr = packHeader(cmd, flags, 0, bodyChecksum, bodySize, key);
  const hdrChecksum = adler32(tmpHdr);
  const hdr = packHeader(cmd, flags, 0, bodyChecksum, bodySize, key, hdrChecksum);
  return bodyBuf.length > 0 ? Buffer.concat([hdr, bodyBuf]) : hdr;
}

function parseHeader(buf: Buffer): { errorCode: number; bodySize: number } {
  if (buf.length < HEADER_SIZE) throw new Error("ACP parseHeader: buffer too short");
  if (buf.slice(0, 4).toString("binary") !== ACP_MAGIC) throw new Error("ACP parseHeader: bad magic");
  return {
    errorCode: buf.readInt32BE(32),
    bodySize: buf.readInt32BE(16),
  };
}

function buildAuthMessage(payload: Buffer): Buffer {
  return buildMessage(Cmd.AUTHENTICATE, 4, generateACPHeaderKey(""), payload);
}

function buildGetPropsMessage(propNames: string[], password: string, encrypted: boolean): Buffer {
  const key = encrypted ? Buffer.alloc(32) : generateACPHeaderKey(password);
  const elems: Buffer[] = propNames.map((name) => {
    const elem = Buffer.alloc(ELEMENT_HEADER_SIZE);
    elem.write(name.substring(0, 4), 0, 4, "binary");
    return elem;
  });
  elems.push(Buffer.alloc(ELEMENT_HEADER_SIZE)); // null terminator
  return buildMessage(Cmd.GET_PROPERTY, 4, key, Buffer.concat(elems));
}

// ── ACP session encryption ────────────────────────────────────────────────────

const PBKDF_SALT0 = Buffer.from("F072FA3F66B410A135FAE8E6D1D43D5F", "hex");
const PBKDF_SALT1 = Buffer.from("BD0682C9FE79325BC73655F4174B996C", "hex");

class AcpEncryption {
  private readonly clientCipher: ReturnType<typeof crypto.createCipheriv>;
  private readonly serverDecipher: ReturnType<typeof crypto.createDecipheriv>;

  constructor(key: Buffer, clientIv: Buffer, serverIv: Buffer) {
    const clientKey = crypto.pbkdf2Sync(key, PBKDF_SALT0, 5, 16, "sha1");
    const serverKey = crypto.pbkdf2Sync(key, PBKDF_SALT1, 7, 16, "sha1");
    this.clientCipher = crypto.createCipheriv("aes-128-ctr", clientKey, clientIv);
    this.serverDecipher = crypto.createDecipheriv("aes-128-ctr", serverKey, serverIv);
  }

  encrypt(data: Buffer): Buffer { return this.clientCipher.update(data); }
  decrypt(data: Buffer): Buffer { return this.serverDecipher.update(data); }
}

// ── ACP socket ────────────────────────────────────────────────────────────────

class AcpSocket {
  private buffer = Buffer.alloc(0);
  private encryption: AcpEncryption | null = null;
  private closed = false;
  private closeError: Error | null = null;

  constructor(private readonly socket: net.Socket) {
    socket.on("data", (chunk: Buffer) => {
      const plain = this.encryption ? this.encryption.decrypt(chunk) : chunk;
      this.buffer = Buffer.concat([this.buffer, plain]);
    });
    socket.on("error", (err) => {
      this.closed = true;
      this.closeError = err;
    });
    socket.on("close", () => {
      this.closed = true;
      if (!this.closeError) this.closeError = new Error("ACP: connection closed by server");
    });
    socket.on("end", () => {
      this.closed = true;
      if (!this.closeError) this.closeError = new Error("ACP: server closed the connection");
    });
  }

  enableEncryption(enc: AcpEncryption): void { this.encryption = enc; }

  async recv(size: number): Promise<Buffer> {
    const deadline = Date.now() + TIMEOUT_MS;
    while (this.buffer.length < size) {
      if (this.closed) throw this.closeError ?? new Error("ACP: connection closed");
      if (Date.now() > deadline) throw new Error("AcpSocket: receive timeout");
      await new Promise((r) => setTimeout(r, 2));
    }
    const out = this.buffer.slice(0, size);
    this.buffer = this.buffer.slice(size);
    return out;
  }

  async send(data: Buffer): Promise<void> {
    const encrypted = this.encryption ? this.encryption.encrypt(data) : data;
    await new Promise<void>((resolve, reject) => {
      this.socket.write(encrypted, (err) => (err ? reject(err) : resolve()));
    });
  }

  async recvHeader(): Promise<{ errorCode: number; bodySize: number }> {
    const buf = await this.recv(HEADER_SIZE);
    return parseHeader(buf);
  }

  async recvMessage(): Promise<{ errorCode: number; body: Buffer }> {
    const { errorCode, bodySize } = await this.recvHeader();
    const body = bodySize > 0 ? await this.recv(bodySize) : Buffer.alloc(0);
    return { errorCode, body };
  }

  end(): void { this.socket.end(); }
}

// ── ACP client ────────────────────────────────────────────────────────────────

class AcpClient {
  private sock: AcpSocket | null = null;
  private sessionEncrypted = false;

  constructor(
    private readonly host: string,
    private readonly password: string,
  ) {}

  async connect(): Promise<void> {
    const socket = await new Promise<net.Socket>((resolve, reject) => {
      const s = net.createConnection({ host: this.host, port: ACP_PORT });
      const timer = setTimeout(() => { s.destroy(); reject(new Error("ACP connect timeout")); }, TIMEOUT_MS);
      s.once("connect", () => { clearTimeout(timer); resolve(s); });
      s.once("error", (e) => { clearTimeout(timer); reject(e); });
    });
    socket.setTimeout(TIMEOUT_MS);
    this.sock = new AcpSocket(socket);
    // TCP connect only — no hello handshake in ACP
  }

  async authenticate(): Promise<void> {
    if (!this.sock) throw new Error("ACP not connected");

    // Stage 1: send auth request (key = keystream of empty string)
    await this.sock.send(buildAuthMessage(cfbCompose({ state: 1, username: "admin" })));

    // Stage 2: receive SRP parameters from server
    const resp2 = await this.sock.recvMessage().catch((e: Error) => { throw new Error(`ACP auth stage2: ${e.message}`); });
    if (resp2.errorCode !== 0) throw new Error(`ACP auth stage2 error ${resp2.errorCode}`);
    const data2 = cfbParse(resp2.body) as { salt: Buffer; publicKey: Buffer; generator: Buffer; modulus: Buffer };

    // Stage 3: SRP-1536 client computation
    // Server's modulus matches SRP.params[1536].N (per node-acp source)
    const params = SRP.params[1536];
    const clientSecret = crypto.randomBytes(32);
    const srpc = new SrpClient(params, data2.salt, Buffer.from("admin"), Buffer.from(this.password), clientSecret);
    srpc.setB(data2.publicKey);
    const A = srpc.computeA();
    const M1 = srpc.computeM1();
    const iv = crypto.randomBytes(16);

    await this.sock.send(buildAuthMessage(cfbCompose({ iv, publicKey: A, state: 3, response: M1 })));

    // Stage 4: server verifies M1, sends M2 + its IV
    const resp4 = await this.sock.recvMessage().catch((e: Error) => { throw new Error(`ACP auth stage4: ${e.message}`); });
    if (resp4.errorCode !== 0) throw new Error(`ACP auth stage4 error ${resp4.errorCode}`);
    const data4 = cfbParse(resp4.body) as { response: Buffer; iv: Buffer };

    // Stage 5: verify M2, enable session encryption
    srpc.checkM2(data4.response);
    this.sock.enableEncryption(new AcpEncryption(srpc.computeK(), iv, data4.iv));
    this.sessionEncrypted = true;
  }

  /**
   * Fetch multiple properties in one request using the streaming protocol.
   *
   * Client sends one GetProp with all property names.
   * Server responds with a stream header (body_size = -1), then streams
   * 12-byte property element headers each followed by the value, ending
   * with a null-name terminator.
   */
  async getProperties(names: string[]): Promise<Map<string, unknown>> {
    if (!this.sock) throw new Error("ACP not connected");
    const result = new Map<string, unknown>();

    await this.sock.send(buildGetPropsMessage(names, this.password, this.sessionEncrypted));

    // Stream header — body_size is -1 for streaming responses
    await this.sock.recvHeader();

    // Read property elements until null terminator
    while (true) {
      const elemHdr = await this.sock.recv(ELEMENT_HEADER_SIZE);
      const elemName = elemHdr.slice(0, 4).toString("binary");
      const flags = elemHdr.readUInt32BE(4);
      const size = elemHdr.readUInt32BE(8);

      if (elemName === "\x00\x00\x00\x00") break;

      const value = size > 0 ? await this.sock.recv(size) : Buffer.alloc(0);

      if (flags & 1) continue; // error for this property

      if (size > 0) {
        try {
          result.set(elemName, cfbParse(value));
        } catch {
          result.set(elemName, value);
        }
      }
    }

    return result;
  }

  disconnect(): void {
    this.sock?.end();
    this.sock = null;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatMac(v: unknown): string {
  if (Buffer.isBuffer(v) && v.length === 6) {
    return Array.from(v).map((b) => b.toString(16).padStart(2, "0")).join(":").toUpperCase();
  }
  return String(v ?? "").toUpperCase();
}

function toRssiDbm(rssi: unknown): number {
  if (typeof rssi === "bigint") return Number(BigInt.asIntN(64, rssi));
  return Number(rssi) || 0;
}

function channelToBand(channel: number): "2.4G" | "5G" {
  return channel > 14 ? "5G" : "2.4G";
}

// ── Public types ──────────────────────────────────────────────────────────────

export interface AirportWifiClient {
  mac: string;
  ip: string;
  hostname: string;
  rssi_dbm: number;
  txrate_mbps: number;
}

export interface AirportAccessPoint {
  ifname: string;
  ssid: string;
  band: "2.4G" | "5G";
  channel: number;
  clients: AirportWifiClient[];
}

export interface AirportWirelessData {
  online: boolean;
  accessPoints: AirportAccessPoint[];
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function checkAcpOnline(host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const s = net.createConnection({ host, port: ACP_PORT });
    const timer = setTimeout(() => { s.destroy(); resolve(false); }, 3000);
    s.once("connect", () => { clearTimeout(timer); s.destroy(); resolve(true); });
    s.once("error", () => { clearTimeout(timer); resolve(false); });
  });
}

export async function fetchAcpHosts(host: string, password: string) {
  const client = new AcpClient(host, password);
  try {
    await client.connect();
    await client.authenticate();
    const props = await client.getProperties(["raSL", "dhSL"]);
    return buildHostData(props);
  } finally {
    client.disconnect();
  }
}

export async function fetchAcpRawProps(host: string, password: string): Promise<unknown> {
  const client = new AcpClient(host, password);
  try {
    await client.connect();
    await client.authenticate();
    const props = await client.getProperties(["WiFi", "raSL", "dhSL"]);
    return safeSerialize(Object.fromEntries(props));
  } finally {
    client.disconnect();
  }
}

function safeSerialize(v: unknown): unknown {
  if (v === null || v === undefined) return v;
  if (typeof v === "bigint") return v.toString();
  if (Buffer.isBuffer(v)) return v.toString("hex");
  if (Array.isArray(v)) return v.map(safeSerialize);
  if (typeof v === "object") {
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, safeSerialize(val)]),
    );
  }
  return v;
}

export async function fetchAcpWireless(host: string, password: string): Promise<AirportWirelessData> {
  const client = new AcpClient(host, password);
  try {
    await client.connect();
    await client.authenticate();
    const props = await client.getProperties(["WiFi", "raSL", "dhSL"]);
    return buildWirelessData(props);
  } finally {
    client.disconnect();
  }
}

// ── Internal data builders ────────────────────────────────────────────────────

function buildMacToLease(dhSL: unknown): Map<string, { ip: string; hostname: string }> {
  const map = new Map<string, { ip: string; hostname: string }>();
  const raw = Array.isArray(dhSL) ? dhSL : ((dhSL as { leases?: unknown[] })?.leases ?? []);
  const leases = raw as Record<string, unknown>[];
  for (const l of leases) {
    const mac = formatMac(l.macAddress);
    if (mac) map.set(mac, { ip: String(l.ipAddress ?? ""), hostname: String(l.hostname ?? "") });
  }
  return map;
}

function buildHostData(props: Map<string, unknown>) {
  const raSL = props.get("raSL") as Record<string, unknown[]> | undefined;
  const macToLease = buildMacToLease(props.get("dhSL"));

  const hosts: { mac: string; ip: string; hostname: string; wireless: boolean }[] = [];
  const seen = new Set<string>();

  for (const clients of Object.values(raSL ?? {})) {
    for (const c of clients) {
      const entry = c as Record<string, unknown>;
      const mac = formatMac(entry.macAddress);
      if (!mac || seen.has(mac)) continue;
      seen.add(mac);
      const lease = macToLease.get(mac);
      hosts.push({ mac, ip: lease?.ip ?? "", hostname: lease?.hostname ?? "", wireless: true });
    }
  }
  return { hosts };
}

function buildWirelessData(props: Map<string, unknown>): AirportWirelessData {
  const wifiProp = props.get("WiFi") as { radios?: Record<string, unknown>[] } | undefined;
  const raSL = props.get("raSL") as Record<string, unknown[]> | undefined;
  const macToLease = buildMacToLease(props.get("dhSL"));

  const radios = wifiProp?.radios ?? [];
  const accessPoints: AirportAccessPoint[] = [];

  radios.forEach((radio, i) => {
    const ifname = `wlan${i}`;
    const ssid = String(radio.raNm ?? "");
    const channel = Number(radio.raCh ?? 0);
    const band = channelToBand(channel);

    const rawClients = raSL?.[ifname] ?? [];
    const clients: AirportWifiClient[] = [];
    const seen = new Set<string>();

    for (const c of rawClients) {
      const entry = c as Record<string, unknown>;
      const mac = formatMac(entry.macAddress);
      if (!mac || seen.has(mac)) continue;
      seen.add(mac);
      const lease = macToLease.get(mac);
      clients.push({
        mac,
        ip: lease?.ip ?? "",
        hostname: lease?.hostname ?? "",
        rssi_dbm: toRssiDbm(entry.rssi),
        txrate_mbps: Number(entry.txrate ?? 0),
      });
    }

    accessPoints.push({ ifname, ssid, band, channel, clients });
  });

  // Fallback: if WiFi property not available, build from raSL alone
  if (accessPoints.length === 0 && raSL) {
    for (const [ifname, rawClients] of Object.entries(raSL)) {
      const clients: AirportWifiClient[] = [];
      for (const c of rawClients) {
        const entry = c as Record<string, unknown>;
        const mac = formatMac(entry.macAddress);
        if (!mac) continue;
        const lease = macToLease.get(mac);
        clients.push({
          mac,
          ip: lease?.ip ?? "",
          hostname: lease?.hostname ?? "",
          rssi_dbm: toRssiDbm(entry.rssi),
          txrate_mbps: Number(entry.txrate ?? 0),
        });
      }
      const band: "2.4G" | "5G" = ifname.endsWith("1") ? "5G" : "2.4G";
      accessPoints.push({ ifname, ssid: "", band, channel: 0, clients });
    }
  }

  return { online: true, accessPoints };
}

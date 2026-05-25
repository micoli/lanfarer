import type http from "node:http";
import type { BboxRouterSpec } from "../../../../server/config.ts";
import type { WirelessData, AccessPoint, WirelessClient } from "../../../contracts.ts";
import { bboxCall } from "../client.ts";
import { sendJson, sendError } from "../utils.ts";

type RawStation = {
  macaddress?: string;
  rssi?: number;
  txRate?: number;
  rxRate?: number;
};

type RawWirelessHost = {
  ssid?: string;
  guest?: number;
  compatibility?: number;
  stations?: RawStation[];
};

type RawSsid = { id?: string };
type RawRadio = { current_channel?: number };

function makeClients(stations: RawStation[] = []): WirelessClient[] {
  return stations
    .filter((s) => s.macaddress)
    .map((s) => ({
      mac: s.macaddress!,
      signal_dbm: Number(s.rssi) || 0,
      tx_kbps: Math.round((Number(s.txRate) || 0) * 1000),
      rx_kbps: Math.round((Number(s.rxRate) || 0) * 1000),
      inactive_ms: 0,
    }));
}

export async function fetchBboxWireless(spec: BboxRouterSpec): Promise<WirelessData> {
  const [wirelessResult, hostsResult] = await Promise.all([
    bboxCall(spec, "GET", "/api/v1/wireless"),
    bboxCall(spec, "GET", "/api/v1/hosts"),
  ]);

  if (wirelessResult.statusCode !== 200 || hostsResult.statusCode !== 200) {
    return { online: false, accessPoints: [] };
  }

  const hostsArr = hostsResult.data as Array<{ wirelesshosts?: RawWirelessHost[] }>;
  const wirelessArr = wirelessResult.data as Array<{
    wireless?: {
      ssid?: Record<string, RawSsid>;
      radio?: Record<string, RawRadio>;
    };
  }>;

  const wirelessHosts = hostsArr[0]?.wirelesshosts ?? [];
  const wirelessConfig = wirelessArr[0]?.wireless;
  const ssids = wirelessConfig?.ssid ?? {};
  const radios = wirelessConfig?.radio ?? {};

  const main = wirelessHosts.filter((e) => !e.guest && !e.compatibility);
  const guestEntries = wirelessHosts.filter((e) => e.guest);
  const compatEntries = wirelessHosts.filter((e) => e.compatibility);

  const bandKeys = ["24", "5"] as const;
  const bandLabels = ["2.4G", "5G"] as const;

  const accessPoints: AccessPoint[] = [];

  for (let i = 0; i < main.length; i++) {
    const entry = main[i];
    const clients = makeClients(entry.stations);
    if (clients.length === 0) continue;
    const bk = bandKeys[i] ?? "5";
    const band = bandLabels[i] ?? "5G";
    accessPoints.push({
      ssid: ssids[bk]?.id ?? entry.ssid ?? "",
      band,
      channel: radios[bk]?.current_channel ?? 0,
      clients,
    });
  }

  for (const entry of guestEntries) {
    const clients = makeClients(entry.stations);
    if (clients.length === 0) continue;
    accessPoints.push({
      ssid: ssids.guest?.id ?? entry.ssid ?? "Guest",
      band: "2.4G",
      channel: radios["24"]?.current_channel ?? 0,
      clients,
    });
  }

  for (const entry of compatEntries) {
    const clients = makeClients(entry.stations);
    if (clients.length === 0) continue;
    accessPoints.push({
      ssid: ssids.compatibility?.id ?? entry.ssid ?? "Compatibility",
      band: "2.4G",
      channel: 0,
      clients,
    });
  }

  return { online: true, accessPoints };
}

export async function handleWireless(
  _req: http.IncomingMessage,
  res: http.ServerResponse,
  spec: BboxRouterSpec,
): Promise<void> {
  const result = await fetchBboxWireless(spec);
  if (!result.online && result.accessPoints.length === 0) {
    sendError(res, 502, "Failed to fetch wireless data from bbox");
    return;
  }
  sendJson(res, 200, result);
}

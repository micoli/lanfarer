import { ApiProperty } from "@nestjs/swagger";

// ── Auth ─────────────────────────────────────────────────────────────────────

export class LoginRequest {
  @ApiProperty({ type: String, example: "admin" })
  username!: string;

  @ApiProperty({ type: String, example: "secret" })
  password!: string;
}

export class LoginResponse {
  @ApiProperty({ type: Boolean })
  ok!: boolean;

  @ApiProperty({ type: String, example: "admin" })
  username!: string;
}

export class MeResponse {
  @ApiProperty({ type: String, nullable: true, example: "admin" })
  username!: string | null;

  @ApiProperty({ type: Boolean })
  authEnabled!: boolean;
}

// ── Health ───────────────────────────────────────────────────────────────────

export class HealthResponse {
  @ApiProperty({ type: Boolean })
  ok!: boolean;

  @ApiProperty({ type: Boolean })
  hasSession!: boolean;

  @ApiProperty({ type: String, example: "https://mabbox.bytel.fr" })
  target!: string;
}

// ── Check IP ─────────────────────────────────────────────────────────────────

export class CheckIpResponse {
  @ApiProperty({ type: Boolean })
  reachable!: boolean;

  @ApiProperty({ type: String, nullable: true, example: "aa:bb:cc:dd:ee:ff" })
  mac!: string | null;
}

// ── Probe ─────────────────────────────────────────────────────────────────────

export class PingStats {
  @ApiProperty({ type: Number })
  min!: number;

  @ApiProperty({ type: Number })
  avg!: number;

  @ApiProperty({ type: Number })
  max!: number;
}

export class ProbeResult {
  @ApiProperty({ type: String })
  ip!: string;

  @ApiProperty({ type: () => PingStats, nullable: true })
  pingStats!: PingStats | null;

  @ApiProperty({ type: Number, isArray: true })
  openPorts!: number[];

  @ApiProperty({ type: String })
  mdnsName!: string;

  @ApiProperty({ type: String })
  smbName!: string;

  @ApiProperty({ type: String })
  smbDomain!: string;
}

// ── OUI ──────────────────────────────────────────────────────────────────────

export class OuiResponse {
  @ApiProperty({ type: String, nullable: true, example: "Apple, Inc." })
  vendor!: string | null;
}

// ── Router config ─────────────────────────────────────────────────────────────

export class RouterEntry {
  @ApiProperty({ type: String, example: "bbox-main" })
  name!: string;

  @ApiProperty({ type: String, example: "bbox" })
  type!: string;

  @ApiProperty({ type: String, example: "192.168.1.1", required: false })
  ip?: string;
}

// ── UI config ─────────────────────────────────────────────────────────────────

export class UiMenuItem {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String, required: false, example: "bbox-main" })
  router?: string;

  @ApiProperty({ type: "array", items: { $ref: "#/components/schemas/UiMenuItem" }, required: false })
  children?: UiMenuItem[];
}

export class UiWidget {
  @ApiProperty({ type: String })
  type!: string;

  @ApiProperty({ type: String })
  id!: string;
}

export class UiHomeConfig {
  @ApiProperty({ type: () => UiWidget, isArray: true })
  widgets!: UiWidget[];
}

export class UiDhcpConfig {
  @ApiProperty({ type: String })
  router!: string;
}

export class UiConfig {
  @ApiProperty({ type: () => UiMenuItem, isArray: true, nullable: true })
  menu!: UiMenuItem[] | null;

  @ApiProperty({ type: () => UiHomeConfig, nullable: true })
  home!: UiHomeConfig | null;

  @ApiProperty({ type: () => UiDhcpConfig, nullable: true })
  dhcp!: UiDhcpConfig | null;
}

// ── Wireless ──────────────────────────────────────────────────────────────────

export class WirelessClient {
  @ApiProperty({ type: String, example: "AA:BB:CC:DD:EE:FF" })
  mac!: string;

  @ApiProperty({ type: Number, description: "Signal en dBm (négatif)", example: -65 })
  signal_dbm!: number;

  @ApiProperty({ type: Number, description: "Débit Tx en kbps" })
  tx_kbps!: number;

  @ApiProperty({ type: Number, description: "Débit Rx en kbps" })
  rx_kbps!: number;

  @ApiProperty({ type: Number, description: "Inactivité en ms" })
  inactive_ms!: number;
}

export class AccessPoint {
  @ApiProperty({ type: String })
  ssid!: string;

  @ApiProperty({ enum: ["2.4G", "5G"] })
  band!: "2.4G" | "5G";

  @ApiProperty({ type: Number })
  channel!: number;

  @ApiProperty({ type: () => WirelessClient, isArray: true })
  clients!: WirelessClient[];

  @ApiProperty({ type: String, required: false })
  bssid?: string;

  @ApiProperty({ type: String, required: false })
  password?: string;

  @ApiProperty({ type: String, required: false })
  standard?: string;

  @ApiProperty({ type: Number, required: false })
  width?: number;
}

export class WirelessData {
  @ApiProperty({ type: Boolean })
  online!: boolean;

  @ApiProperty({ type: () => AccessPoint, isArray: true })
  accessPoints!: AccessPoint[];
}

// ── Hosts ─────────────────────────────────────────────────────────────────────

export class Host {
  @ApiProperty({ type: String, example: "AA:BB:CC:DD:EE:FF" })
  mac!: string;

  @ApiProperty({ type: String, example: "192.168.1.10" })
  ip!: string;

  @ApiProperty({ type: String, required: false })
  ip6?: string;

  @ApiProperty({ type: String })
  hostname!: string;

  @ApiProperty({ type: Boolean })
  active!: boolean;

  @ApiProperty({ type: String, required: false })
  type?: string;

  @ApiProperty({ enum: ["wired", "wifi 2.4G", "wifi 5G"], required: false })
  connexion?: string;

  @ApiProperty({ type: String, required: false })
  ssid?: string;

  @ApiProperty({ type: Number, required: false, description: "Unix timestamp (secondes)" })
  lastseen?: number;
}

export class HostsData {
  @ApiProperty({ type: () => Host, isArray: true })
  hosts!: Host[];
}

// ── Scan SSE events ───────────────────────────────────────────────────────────

export class ScanProgressEvent {
  @ApiProperty({ type: Number })
  done!: number;

  @ApiProperty({ type: Number })
  total!: number;
}

export class ScanHostEvent {
  @ApiProperty({ type: String })
  ip!: string;

  @ApiProperty({ type: String })
  mac!: string;

  @ApiProperty({ type: String })
  hostname!: string;

  @ApiProperty({ type: String })
  vendor!: string;

  @ApiProperty({ type: Boolean })
  ping!: boolean;
}

export class HostDetailEvent {
  @ApiProperty({ type: String })
  ip!: string;

  @ApiProperty({ type: Number, isArray: true })
  openPorts!: number[];

  @ApiProperty({ type: String })
  mdnsName!: string;

  @ApiProperty({ type: String })
  smbName!: string;

  @ApiProperty({ type: String })
  smbDomain!: string;
}

// ── Ping SSE events ───────────────────────────────────────────────────────────

export class PingResult {
  @ApiProperty({ type: String })
  ip!: string;

  @ApiProperty({ type: Number, nullable: true, description: "RTT en ms, null si injoignable" })
  rtt!: number | null;
}

// ── Hosts SSE events ──────────────────────────────────────────────────────────

export class HostsProgressEvent {
  @ApiProperty({ type: Number, description: "Pourcentage d'avancement (0-100)" })
  pct!: number;

  @ApiProperty({ type: String, description: "Nom du plugin en cours" })
  label!: string;
}

// ── Map topology ──────────────────────────────────────────────────────────────

export class MapClient {
  @ApiProperty({ type: String, example: "AA:BB:CC:DD:EE:FF" })
  mac!: string;

  @ApiProperty({ type: String, required: false })
  hostname?: string;

  @ApiProperty({ type: String, required: false, example: "192.168.1.10" })
  ip?: string;

  @ApiProperty({ type: Number, required: false, example: -65 })
  signal_dbm?: number;
}

export class MapAccessPoint {
  @ApiProperty({ type: String })
  id!: string;

  @ApiProperty({ type: String })
  label!: string;

  @ApiProperty({ type: String, required: false })
  sublabel?: string;

  @ApiProperty({ type: String, example: "bbox-wifi" })
  kind!: string;

  @ApiProperty({ type: Boolean })
  online!: boolean;

  @ApiProperty({ type: () => MapClient, isArray: true })
  clients!: MapClient[];
}

export class MapTopology {
  @ApiProperty({ type: () => MapAccessPoint, isArray: true })
  accessPoints!: MapAccessPoint[];
}

// ── BBox device / WAN ─────────────────────────────────────────────────────────

export class DeviceUsing {
  @ApiProperty({ type: Boolean })
  ipv4!: boolean;

  @ApiProperty({ type: Boolean })
  ipv6!: boolean;

  @ApiProperty({ type: Boolean })
  ftth!: boolean;
}

export class DeviceData {
  @ApiProperty({ type: String })
  modelname!: string;

  @ApiProperty({ type: String })
  serialnumber!: string;

  @ApiProperty({ type: String })
  firmware!: string;

  @ApiProperty({ type: String })
  firmwareDate!: string;

  @ApiProperty({ type: Number, description: "Uptime en secondes" })
  uptime!: number;

  @ApiProperty({ type: Number })
  boots!: number;

  @ApiProperty({ type: () => DeviceUsing })
  using!: DeviceUsing;
}

export class WanStatsSide {
  @ApiProperty({ type: Number })
  bytes!: number;

  @ApiProperty({ type: Number })
  bandwidth!: number;

  @ApiProperty({ type: Number })
  contractualBandwidth!: number;

  @ApiProperty({ type: Number })
  occupation!: number;
}

export class WanStatsData {
  @ApiProperty({ type: () => WanStatsSide })
  rx!: WanStatsSide;

  @ApiProperty({ type: () => WanStatsSide })
  tx!: WanStatsSide;
}

export class WanGraphPoint {
  @ApiProperty({ type: Number, description: "Unix timestamp (secondes)" })
  ts!: number;

  @ApiProperty({ type: Number, description: "Débit en kbps" })
  value!: number;
}

export class WanGraphsData {
  @ApiProperty({ type: () => WanGraphPoint, isArray: true })
  down!: WanGraphPoint[];

  @ApiProperty({ type: () => WanGraphPoint, isArray: true })
  up!: WanGraphPoint[];
}

// ── BBox DHCP ─────────────────────────────────────────────────────────────────

export class DhcpClient {
  @ApiProperty({ type: Number })
  id!: number;

  @ApiProperty({ type: Number })
  enable!: number;

  @ApiProperty({ type: String })
  hostname!: string;

  @ApiProperty({ type: String })
  macaddress!: string;

  @ApiProperty({ type: String })
  ipaddress!: string;

  @ApiProperty({ type: String })
  ip6address!: string;
}

export class DhcpClientWrite {
  @ApiProperty({ type: Number })
  enable!: number;

  @ApiProperty({ type: String })
  macaddress!: string;

  @ApiProperty({ type: String })
  ipaddress!: string;

  @ApiProperty({ type: String })
  ip6address!: string;

  @ApiProperty({ type: String })
  hostname!: string;
}

export class DhcpConfig {
  @ApiProperty({ type: Number })
  enable!: number;

  @ApiProperty({ type: String, example: "192.168.1.2" })
  minaddress!: string;

  @ApiProperty({ type: String, example: "192.168.1.254" })
  maxaddress!: string;

  @ApiProperty({ type: Number, description: "Durée de bail en secondes" })
  leasetime!: number;
}

export class DhcpConfigData {
  @ApiProperty({ type: () => DhcpConfig })
  config!: DhcpConfig;
}

export class DhcpConfigUpdate {
  @ApiProperty({ type: Number, required: false })
  enable?: number;

  @ApiProperty({ type: String, required: false })
  minaddress?: string;

  @ApiProperty({ type: String, required: false })
  maxaddress?: string;

  @ApiProperty({ type: Number, required: false })
  leasetime?: number;
}

export class DhcpClientsData {
  @ApiProperty({ type: () => DhcpClient, isArray: true })
  clients!: DhcpClient[];
}

export class DhcpOption {
  @ApiProperty({ type: Number })
  id!: number;

  @ApiProperty({ type: Number })
  option!: number;

  @ApiProperty({ type: String })
  value!: string;
}

export class DhcpOptionWrite {
  @ApiProperty({ type: Number })
  option!: number;

  @ApiProperty({ type: String })
  value!: string;
}

export class DhcpOptionCapability {
  @ApiProperty({ type: Number })
  id!: number;

  @ApiProperty({ enum: ["INT", "IP", "STRING", "BOOL"] })
  type!: "INT" | "IP" | "STRING" | "BOOL";

  @ApiProperty({ type: String })
  description!: string;
}

export class DhcpOptionsData {
  @ApiProperty({ type: () => DhcpOption, isArray: true })
  options!: DhcpOption[];

  @ApiProperty({ type: () => DhcpOption, isArray: true })
  optionsstatic!: DhcpOption[];

  @ApiProperty({ type: () => DhcpOptionCapability, isArray: true })
  capabilities!: DhcpOptionCapability[];
}

// ── Cudy bandwidth ────────────────────────────────────────────────────────────

export class CudyBandwidthPoint {
  @ApiProperty({ type: Number, description: "Unix timestamp (secondes)" })
  ts!: number;

  @ApiProperty({ type: Number, description: "Débit montant en kbps" })
  up!: number;

  @ApiProperty({ type: Number, description: "Débit descendant en kbps" })
  down!: number;
}

export class CudyBandwidthData {
  @ApiProperty({ type: () => CudyBandwidthPoint, isArray: true, description: "Interface 2.4 GHz" })
  ra0!: CudyBandwidthPoint[];

  @ApiProperty({ type: () => CudyBandwidthPoint, isArray: true, description: "Interface 5 GHz" })
  rai0!: CudyBandwidthPoint[];
}

// ── KuWFi bandwidth ───────────────────────────────────────────────────────────

export class KuwfiBandwidthPoint {
  @ApiProperty({ type: Number, description: "Unix timestamp (secondes)" })
  ts!: number;

  @ApiProperty({ type: Number, description: "Débit montant en kbps" })
  up!: number;

  @ApiProperty({ type: Number, description: "Débit descendant en kbps" })
  down!: number;
}

export class KuwfiBandwidthData {
  @ApiProperty({ type: () => KuwfiBandwidthPoint, isArray: true, description: "Bande 2.4 GHz" })
  band24!: KuwfiBandwidthPoint[];

  @ApiProperty({ type: () => KuwfiBandwidthPoint, isArray: true, description: "Bande 5 GHz" })
  band5!: KuwfiBandwidthPoint[];
}

// ── Airport hosts ─────────────────────────────────────────────────────────────

export class AirportHost {
  @ApiProperty({ type: String })
  mac!: string;

  @ApiProperty({ type: String })
  ip!: string;

  @ApiProperty({ type: String })
  hostname!: string;

  @ApiProperty({ type: Boolean })
  wireless!: boolean;
}

export class AirportRouterDetail {
  @ApiProperty({ type: Boolean })
  online!: boolean;

  @ApiProperty({ type: () => AirportHost, isArray: true })
  hosts!: AirportHost[];
}

export class RouterStatusEntry {
  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  ip!: string;
}

export class RouterStatusResponse {
  @ApiProperty({ type: () => RouterStatusEntry, isArray: true })
  routers!: RouterStatusEntry[];
}

// ── KuWFi router data ─────────────────────────────────────────────────────────

export class KuwfiClient {
  @ApiProperty({ type: String })
  mac!: string;

  @ApiProperty({ type: String })
  ip!: string;

  @ApiProperty({ type: Number })
  signal_dbm!: number;

  @ApiProperty({ enum: ["2.4G", "5G"] })
  band!: "2.4G" | "5G";

  @ApiProperty({ type: String })
  ssid!: string;
}

export class KuwfiAccessPoint {
  @ApiProperty({ type: String })
  ssid!: string;

  @ApiProperty({ enum: ["2.4G", "5G"] })
  band!: "2.4G" | "5G";

  @ApiProperty({ type: Number })
  channel!: number;

  @ApiProperty({ type: () => KuwfiClient, isArray: true })
  clients!: KuwfiClient[];
}

export class KuwfiRouterResult {
  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  ip!: string;

  @ApiProperty({ type: Boolean })
  online!: boolean;

  @ApiProperty({ type: String })
  firmware!: string;

  @ApiProperty({ type: Number })
  uptime!: number;

  @ApiProperty({ type: () => KuwfiAccessPoint, isArray: true })
  accessPoints!: KuwfiAccessPoint[];
}

// ── NestWifi router data ──────────────────────────────────────────────────────

export class NestWifiHost {
  @ApiProperty({ type: String })
  mac!: string;

  @ApiProperty({ type: String })
  ip!: string;

  @ApiProperty({ type: String })
  hostname!: string;
}

export class NestWifiRouterResult {
  @ApiProperty({ type: String })
  name!: string;

  @ApiProperty({ type: String })
  ip!: string;

  @ApiProperty({ type: Boolean })
  online!: boolean;

  @ApiProperty({ type: () => NestWifiHost, isArray: true })
  hosts!: NestWifiHost[];
}

// ── Airport wireless (ACP-specific format) ────────────────────────────────────

export class AirportWifiClient {
  @ApiProperty({ type: String })
  mac!: string;

  @ApiProperty({ type: String })
  ip!: string;

  @ApiProperty({ type: String })
  hostname!: string;

  @ApiProperty({ type: Number, description: "RSSI en dBm" })
  rssi_dbm!: number;

  @ApiProperty({ type: Number, description: "Débit Tx en Mbps" })
  txrate_mbps!: number;
}

export class AirportAccessPoint {
  @ApiProperty({ type: String })
  ifname!: string;

  @ApiProperty({ type: String })
  ssid!: string;

  @ApiProperty({ enum: ["2.4G", "5G"] })
  band!: "2.4G" | "5G";

  @ApiProperty({ type: Number })
  channel!: number;

  @ApiProperty({ type: () => AirportWifiClient, isArray: true })
  clients!: AirportWifiClient[];
}

export class AirportWirelessData {
  @ApiProperty({ type: Boolean })
  online!: boolean;

  @ApiProperty({ type: () => AirportAccessPoint, isArray: true })
  accessPoints!: AirportAccessPoint[];
}

// ── Airport wifi-settings ─────────────────────────────────────────────────────

export class AirportWifiInterface {
  @ApiProperty({ type: Number })
  ifIndex!: number;

  @ApiProperty({ type: String })
  description!: string;

  @ApiProperty({ type: Number })
  clientCount!: number;
}

export class AirportWifiSettings {
  @ApiProperty({ type: () => AirportWifiInterface, isArray: true })
  interfaces!: AirportWifiInterface[];
}

// ── Airport device info ───────────────────────────────────────────────────────

export class AirportDeviceInfo {
  @ApiProperty({ type: String, required: false, description: "Adresse MAC LAN" })
  laMA?: string;

  @ApiProperty({ type: String, required: false, description: "Adresse MAC Radio" })
  raMA?: string;

  @ApiProperty({ type: String, required: false, description: "Adresse MAC WAN" })
  waMA?: string;

  @ApiProperty({ type: String, isArray: true, required: false })
  features?: string[];
}

// ── Cudy devlist ──────────────────────────────────────────────────────────────

export class CudyDevlistEntry {
  @ApiProperty({ type: String, description: "Nom de l'interface réseau (ex: ra0, eth0)" })
  iface!: string;

  @ApiProperty({ type: String })
  ip!: string;

  @ApiProperty({ type: String })
  mac!: string;

  @ApiProperty({ type: Number, description: "Débit Tx en kbps" })
  tx_kbps!: number;

  @ApiProperty({ type: Number, description: "Débit Rx en kbps" })
  rx_kbps!: number;

  @ApiProperty({ type: String, nullable: true })
  signal!: string | null;

  @ApiProperty({ type: String, description: "Durée de connexion (ex: 00:01:23)" })
  duration!: string;
}

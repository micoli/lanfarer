// ── Cross-plugin wireless contract ───────────────────────────────────────────

export interface WirelessClient {
  mac: string;
  signal_dbm: number;
  tx_kbps: number;
  rx_kbps: number;
  inactive_ms: number;
}

export interface AccessPoint {
  ssid: string;
  band: "2.4G" | "5G";
  channel: number;
  clients: WirelessClient[];
  bssid?: string;
  password?: string;
  standard?: string;
  width?: number;
}

export interface WirelessData {
  online: boolean;
  accessPoints: AccessPoint[];
}

// ── Cross-plugin host list contract ─────────────────────────────────────────

export type HostConnexion = "wired" | "wifi 2.4G" | "wifi 5G";

export interface Host {
  mac: string;
  ip: string;
  ip6?: string;
  hostname: string;
  active: boolean;
  type?: string;
  connexion?: HostConnexion;
  ssid?: string;
  lastseen?: number;
}

export interface HostsData {
  hosts: Host[];
}

// ── BBox DHCP contracts ──────────────────────────────────────────────────────

export interface DhcpClient {
  id: number;
  enable: number;
  hostname: string;
  macaddress: string;
  ipaddress: string;
  ip6address: string;
}

export interface DhcpConfig {
  enable: number;
  minaddress: string;
  maxaddress: string;
  leasetime: number;
}

export interface DhcpOption {
  id: number;
  option: number;
  value: string;
}

export interface DhcpOptionCapability {
  id: number;
  type: "INT" | "IP" | "STRING" | "BOOL";
  description: string;
}

export interface DhcpClientsData {
  clients: DhcpClient[];
}

export interface DhcpConfigData {
  config: DhcpConfig;
}

export interface DhcpOptionsData {
  options: DhcpOption[];
  optionsstatic: DhcpOption[];
  capabilities: DhcpOptionCapability[];
}

// ── BBox device / WAN contracts ──────────────────────────────────────────────

export interface DeviceData {
  modelname: string;
  serialnumber: string;
  firmware: string;
  firmwareDate: string;
  uptime: number;
  boots: number;
  using: { ipv4: boolean; ipv6: boolean; ftth: boolean };
}

export interface WanStatsData {
  rx: {
    bytes: number;
    bandwidth: number;
    contractualBandwidth: number;
    occupation: number;
  };
  tx: {
    bytes: number;
    bandwidth: number;
    contractualBandwidth: number;
    occupation: number;
  };
}

export interface WanGraphPoint {
  ts: number;
  value: number;
}

export interface WanGraphsData {
  down: WanGraphPoint[];
  up: WanGraphPoint[];
}

export interface CudyBandwidthPoint {
  ts: number;
  up: number;
  down: number;
}

export interface CudyBandwidthData {
  ra0: CudyBandwidthPoint[];
  rai0: CudyBandwidthPoint[];
}

export interface KuwfiBandwidthPoint {
  ts: number;
  up: number;
  down: number;
}

export interface KuwfiBandwidthData {
  band24: KuwfiBandwidthPoint[];
  band5: KuwfiBandwidthPoint[];
}

// ── Map topology contract ─────────────────────────────────────────────────────

export interface MapClient {
  mac: string;
  hostname?: string;
  ip?: string;
  signal_dbm?: number;
}

export interface MapAccessPoint {
  id: string;
  label: string;
  sublabel?: string;
  kind: string;
  online: boolean;
  clients: MapClient[];
}

export interface MapTopology {
  accessPoints: MapAccessPoint[];
}

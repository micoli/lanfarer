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
  rfc: string;
}

export interface DhcpOptionsResponse {
  dhcp: {
    options: DhcpOption[];
    optionsstatic: DhcpOption[];
    optionscount: number;
    optionscapabilities: DhcpOptionCapability[];
  };
}

export interface DhcpResponse {
  dhcp: {
    state: number;
    enable: number;
    minaddress: string;
    maxaddress: string;
    leasetime: number;
  };
}

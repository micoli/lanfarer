import type { IncomingMessage } from "node:http";

const SUPERVISOR_INGRESS_IP = "172.30.32.2";

const trustedIps = new Set(
  (process.env.HASS_INGRESS_TRUSTED_IPS ?? SUPERVISOR_INGRESS_IP)
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean),
);

function remoteIp(req: IncomingMessage): string {
  return (req.socket.remoteAddress ?? "").replace(/^::ffff:/, "");
}

function hasHassUserHeader(req: IncomingMessage): boolean {
  return !!(req.headers["x-hass-user-id"] ?? req.headers["x-remote-user-id"]);
}

/**
 * True only when the request was forwarded by the Home Assistant Supervisor
 * ingress gateway. The header alone is spoofable since the add-on port is
 * also exposed directly, so the source IP must match as well.
 */
export function isHassIngress(req: IncomingMessage): boolean {
  if (!hasHassUserHeader(req)) return false;
  return trustedIps.has(remoteIp(req));
}

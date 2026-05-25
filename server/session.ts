import crypto from "node:crypto";
import http from "node:http";
import { BBOX_PASSWORD, BBOX_HOST, BBOX_CONNECT_HOST, targetUrl, isHttps, type BboxRouterSpec } from "./config.ts";
import { type Captured, makeRequestAsync } from "./http-client.ts";

export interface Session { bboxId: string; btoken: string }

const sessions = new Map<string, Session | null>();
const loginsInProgress = new Map<string, Promise<void>>();

// Legacy single-router accessors used by proxy for the default router
export function getSession(routerId = "default"): Session | null { return sessions.get(routerId) ?? null; }
export function clearSession(routerId = "default"): void { sessions.delete(routerId); }

function sha1hex(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex");
}

function defaultSpec(): BboxRouterSpec {
  return { name: "default", password: BBOX_PASSWORD, host: BBOX_HOST, connectHost: BBOX_CONNECT_HOST, targetUrl, isHttps };
}

async function tryLogin(password: string, captured: Captured, spec: BboxRouterSpec): Promise<number> {
  const body = Buffer.from(new URLSearchParams({ password }).toString());
  const loginHeaders: http.OutgoingHttpHeaders = {
    host: spec.host,
    "content-type": "application/x-www-form-urlencoded",
    "content-length": body.length,
    "user-agent": "Mozilla/5.0",
    "x-requested-with": "XmlHttpRequest",
    origin: `https://${spec.host}`,
    referer: `https://${spec.host}/login.html`,
  };

  const { statusCode, headers: loginResponseHeaders, body: responseBody } = await makeRequestAsync(
    {
      hostname: spec.connectHost,
      port: spec.targetUrl.port ? Number(spec.targetUrl.port) : spec.isHttps ? 443 : 80,
      path: "/api/v1/login",
      method: "POST",
      headers: loginHeaders,
      protocol: spec.targetUrl.protocol,
      rejectUnauthorized: false,
      servername: spec.host,
    },
    body,
    captured,
  );

  console.log(`[session:${spec.name}] login status=${statusCode} set-cookie:`, loginResponseHeaders["set-cookie"] ?? "(none)");
  console.log(`[session:${spec.name}] login body: ${responseBody.toString().slice(0, 500)}`);

  if (!captured.btoken && responseBody.length) {
    try {
      const text = responseBody.toString();
      const json = JSON.parse(text);
      const bt = json?.btoken ?? json?.[0]?.btoken ?? json?.login?.btoken ?? json?.[0]?.login?.btoken;
      if (bt) captured.btoken = bt as string;
    } catch { /* not JSON */ }
  }

  return statusCode;
}

async function fetchBToken(bboxId: string, spec: BboxRouterSpec): Promise<string> {
  const captured: Captured = { bboxId, btoken: "" };
  const { statusCode, body } = await makeRequestAsync(
    {
      hostname: spec.connectHost,
      port: spec.targetUrl.port ? Number(spec.targetUrl.port) : spec.isHttps ? 443 : 80,
      path: "/api/v1/device/token",
      method: "GET",
      headers: {
        host: spec.host,
        "user-agent": "Mozilla/5.0",
        accept: "application/json",
        cookie: `BBOX_ID=${bboxId}`,
      },
      protocol: spec.targetUrl.protocol,
      rejectUnauthorized: false,
      servername: spec.host,
    },
    Buffer.alloc(0),
    captured,
  );
  try {
    const json = JSON.parse(body.toString());
    const token = (json?.[0]?.device?.token ?? json?.device?.token ?? json?.token ?? "") as string;
    console.log(`[session:${spec.name}] GET /api/v1/device/token → ${statusCode} token: ${token ? token.slice(0, 12) + "…" : "(vide)"}`);
    return token;
  } catch {
    console.log(`[session:${spec.name}] GET /api/v1/device/token → ${statusCode} body: ${body.toString().slice(0, 200)}`);
    return "";
  }
}

async function doLogin(spec: BboxRouterSpec): Promise<void> {
  if (!spec.password) return;

  const captured: Captured = { bboxId: "", btoken: "" };

  let status = await tryLogin(spec.password, captured, spec);
  if (status === 401) {
    status = await tryLogin(sha1hex(spec.password), captured, spec);
  }

  if (status === 401 || !captured.bboxId) {
    console.error(`[session:${spec.name}] Authentification Bbox échouée — vérifiez le mot de passe dans config.yaml`);
    sessions.set(spec.name, null);
    return;
  }

  const btoken = await fetchBToken(captured.bboxId, spec);
  const s: Session = { bboxId: captured.bboxId, btoken };
  sessions.set(spec.name, s);
  console.log(`[session:${spec.name}] Session établie — bboxId: ${s.bboxId.slice(0, 12)}… btoken: ${s.btoken.slice(0, 20)}…`);
}

export async function ensureSession(spec?: BboxRouterSpec): Promise<Session | null> {
  const resolved = spec ?? defaultSpec();
  const key = resolved.name;

  const existing = sessions.get(key);
  if (existing !== undefined) return existing;

  const inProgress = loginsInProgress.get(key);
  if (inProgress) { await inProgress; return sessions.get(key) ?? null; }

  const promise = doLogin(resolved).finally(() => { loginsInProgress.delete(key); });
  loginsInProgress.set(key, promise);
  await promise;
  return sessions.get(key) ?? null;
}

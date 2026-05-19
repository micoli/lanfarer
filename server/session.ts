import crypto from "node:crypto";
import http from "node:http";
import { BBOX_PASSWORD, BBOX_HOST, targetUrl, isHttps } from "./config.ts";
import { type Captured, makeRequestAsync } from "./http-client.ts";

export interface Session { bboxId: string; btoken: string }

let session: Session | null = null;
let loginInProgress: Promise<void> | null = null;

export function getSession(): Session | null { return session; }
export function setSession(s: Session | null): void { session = s; }
export function clearSession(): void { session = null; }

function sha1hex(s: string): string {
  return crypto.createHash("sha1").update(s).digest("hex");
}

async function tryLogin(password: string, captured: Captured): Promise<number> {
  const body = Buffer.from(new URLSearchParams({ password }).toString());
  const loginHeaders: http.OutgoingHttpHeaders = {
    host: BBOX_HOST,
    "content-type": "application/x-www-form-urlencoded",
    "content-length": body.length,
    "user-agent": "Mozilla/5.0",
    "x-requested-with": "XmlHttpRequest",
    origin: `https://${BBOX_HOST}`,
    referer: `https://${BBOX_HOST}/login.html`,
  };

  const { statusCode, headers: loginResponseHeaders, body: responseBody } = await makeRequestAsync(
    {
      hostname: targetUrl.hostname,
      port: targetUrl.port ? Number(targetUrl.port) : isHttps ? 443 : 80,
      path: "/api/v1/login",
      method: "POST",
      headers: loginHeaders,
      protocol: targetUrl.protocol,
      rejectUnauthorized: false,
    },
    body,
    captured,
  );

  console.log(`[server] login status=${statusCode} set-cookie:`, loginResponseHeaders["set-cookie"] ?? "(none)");
  console.log(`[server] login body: ${responseBody.toString().slice(0, 500)}`);

  if (!captured.btoken && responseBody.length) {
    try {
      const text = responseBody.toString();
      const json = JSON.parse(text);
      const bt =
        json?.btoken ??
        json?.[0]?.btoken ??
        json?.login?.btoken ??
        json?.[0]?.login?.btoken;
      if (bt) captured.btoken = bt as string;
    } catch { /* not JSON */ }
  }

  return statusCode;
}

async function fetchBToken(bboxId: string): Promise<string> {
  const captured: Captured = { bboxId, btoken: "" };
  const { statusCode, body } = await makeRequestAsync(
    {
      hostname: targetUrl.hostname,
      port: targetUrl.port ? Number(targetUrl.port) : isHttps ? 443 : 80,
      path: "/api/v1/device/token",
      method: "GET",
      headers: {
        host: BBOX_HOST,
        "user-agent": "Mozilla/5.0",
        accept: "application/json",
        cookie: `BBOX_ID=${bboxId}`,
      },
      protocol: targetUrl.protocol,
      rejectUnauthorized: false,
    },
    Buffer.alloc(0),
    captured,
  );
  try {
    const json = JSON.parse(body.toString());
    const token = (json?.[0]?.device?.token ?? json?.device?.token ?? json?.token ?? "") as string;
    console.log(`[server] GET /api/v1/device/token → ${statusCode} token: ${token ? token.slice(0, 12) + "…" : "(vide)"}`);
    return token;
  } catch {
    console.log(`[server] GET /api/v1/device/token → ${statusCode} body: ${body.toString().slice(0, 200)}`);
    return "";
  }
}

async function doLogin(): Promise<void> {
  if (!BBOX_PASSWORD) return;

  const captured: Captured = { bboxId: "", btoken: "" };

  let status = await tryLogin(BBOX_PASSWORD, captured);
  if (status === 401) {
    status = await tryLogin(sha1hex(BBOX_PASSWORD), captured);
  }

  if (status === 401 || !captured.bboxId) {
    console.error("[server] Authentification Bbox échouée — vérifiez BBOX_PASSWORD");
    session = null;
    return;
  }

  const btoken = await fetchBToken(captured.bboxId);
  session = { bboxId: captured.bboxId, btoken };
  console.log(`[server] Session établie — bboxId: ${session.bboxId.slice(0, 12)}… btoken: ${session.btoken.slice(0, 20)}…`);
}

export async function ensureSession(): Promise<Session | null> {
  if (session) return session;
  if (!BBOX_PASSWORD) return null;
  if (loginInProgress) { await loginInProgress; return session; }
  loginInProgress = doLogin().finally(() => { loginInProgress = null; });
  await loginInProgress;
  return session;
}

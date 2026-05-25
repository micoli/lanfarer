import {
  type BboxRouterSpec,
  BBOX_HOST,
  BBOX_CONNECT_HOST,
  BBOX_PASSWORD,
  VERBOSE,
  targetUrl,
  isHttps,
  loadBboxRouterByName,
} from "../../../server/config.ts";
import { type Captured, makeRequestAsync } from "../../../server/http-client.ts";
import { ensureSession, getSession, clearSession } from "../../../server/session.ts";

export function defaultSpec(): BboxRouterSpec {
  return {
    name: "default",
    password: BBOX_PASSWORD,
    host: BBOX_HOST,
    connectHost: BBOX_CONNECT_HOST,
    targetUrl,
    isHttps,
  };
}

export function resolveSpec(routerId: string): BboxRouterSpec | null {
  return loadBboxRouterByName(routerId) ?? (routerId === "default" ? defaultSpec() : null);
}

export interface BboxCallResult {
  statusCode: number;
  data: unknown;
}

export async function bboxCall(
  spec: BboxRouterSpec,
  method: string,
  bboxPath: string,
  body?: Record<string, unknown>,
): Promise<BboxCallResult> {
  return bboxCallInternal(spec, method, bboxPath, body, false);
}

async function bboxCallInternal(
  spec: BboxRouterSpec,
  method: string,
  bboxPath: string,
  body: Record<string, unknown> | undefined,
  retry: boolean,
): Promise<BboxCallResult> {
  const sess = await ensureSession(spec);

  const headers: Record<string, string | number> = { host: spec.host };
  if (sess) {
    const cookieParts = [`BBOX_ID=${sess.bboxId}`];
    if (sess.btoken) cookieParts.push(`btoken=${sess.btoken}`);
    headers["cookie"] = cookieParts.join("; ");
  }

  let reqPath = bboxPath;
  if (["POST", "PUT", "DELETE"].includes(method) && sess?.btoken) {
    const sep = reqPath.includes("?") ? "&" : "?";
    reqPath += `${sep}btoken=${encodeURIComponent(sess.btoken)}`;
  }

  let bodyBuffer = Buffer.alloc(0);
  if (body !== undefined) {
    const form = new URLSearchParams(
      Object.entries(body).map(([k, v]) => [k, String(v)]),
    ).toString();
    bodyBuffer = Buffer.from(form);
    headers["content-type"] = "application/x-www-form-urlencoded";
    headers["content-length"] = bodyBuffer.length;
  }

  if (VERBOSE) console.log(`[bbox:${spec.name}] ${method} ${reqPath}`);

  const captured: Captured = { bboxId: sess?.bboxId ?? "", btoken: sess?.btoken ?? "" };

  const { statusCode, body: responseBody } = await makeRequestAsync(
    {
      hostname: spec.connectHost,
      port: spec.targetUrl.port ? Number(spec.targetUrl.port) : spec.isHttps ? 443 : 80,
      path: reqPath,
      method,
      headers,
      protocol: spec.targetUrl.protocol,
      rejectUnauthorized: false,
      servername: spec.host,
    },
    bodyBuffer,
    captured,
  );

  const currentSession = getSession(spec.name);
  if (captured.bboxId && currentSession) currentSession.bboxId = captured.bboxId;
  if (captured.btoken && currentSession) currentSession.btoken = captured.btoken;

  if ((statusCode === 401 || statusCode === 403) && !retry) {
    console.log(`[bbox:${spec.name}] Token expiré, re-authentification…`);
    clearSession(spec.name);
    await ensureSession(spec);
    return bboxCallInternal(spec, method, bboxPath, body, true);
  }

  let data: unknown = null;
  if (responseBody.length > 0) {
    try {
      data = JSON.parse(responseBody.toString());
    } catch {
      /* empty or non-JSON body */
    }
  }

  return { statusCode, data };
}

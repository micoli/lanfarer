import http from "node:http";
import { BBOX_HOST, BBOX_CONNECT_HOST, BBOX_PASSWORD, targetUrl, isHttps, loadBboxRouterByName, type BboxRouterSpec } from "../../../server/config.ts";
import { type Captured, makeRequestAsync } from "../../../server/http-client.ts";
import { ensureSession, getSession, clearSession, type Session } from "../../../server/session.ts";

function defaultSpec(): BboxRouterSpec {
  return { name: "default", password: BBOX_PASSWORD, host: BBOX_HOST, connectHost: BBOX_CONNECT_HOST, targetUrl, isHttps };
}

function parseRouterPath(url: string): { routerId: string; rawPath: string } | null {
  // URL format: /devices/api-proxy/bbox/bbox/{routerId}/api/v1/...
  const afterPrefix = url.slice("/devices/api-proxy/bbox/bbox/".length);
  const slashIdx = afterPrefix.indexOf("/");
  const routerId = slashIdx === -1 ? afterPrefix.split("?")[0] : afterPrefix.slice(0, slashIdx);
  if (!routerId) return null;
  const rawPath = slashIdx === -1 ? "/" : afterPrefix.slice(slashIdx);
  return { routerId, rawPath };
}

export async function bboxApiProxy(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<void> {
  const chunks: Buffer[] = [];
  await new Promise<void>((resolve) => {
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", resolve);
  });
  let body = Buffer.concat(chunks);
  const method = req.method ?? "GET";
  const url = req.url ?? "/";
  const contentType = req.headers["content-type"] ?? "";

  const parsed = parseRouterPath(url);
  if (!parsed) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "Missing routerId in devices/api-proxy/bbox/bbox path" }));
    return;
  }
  const { routerId, rawPath } = parsed;

  const spec = loadBboxRouterByName(routerId) ?? (routerId === "default" ? defaultSpec() : null);
  if (!spec) {
    res.writeHead(400, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: `Router '${routerId}' not found in configuration` }));
    return;
  }

  if (contentType.includes("application/json") && body.length) {
    try {
      const json = JSON.parse(body.toString()) as Record<string, unknown>;
      const form = new URLSearchParams(
        Object.entries(json).map(([k, v]) => [k, String(v)])
      ).toString();
      body = Buffer.from(form);
      req.headers["content-type"] = "application/x-www-form-urlencoded";
    } catch {
      // Leave body as-is if parsing fails
    }
  }

  await dispatchProxy(method, rawPath, req.headers, body, res, false, spec);
}

async function dispatchProxy(
  method: string,
  rawPath: string,
  reqHeaders: http.IncomingHttpHeaders,
  body: Buffer,
  res: http.ServerResponse,
  retry: boolean,
  spec: BboxRouterSpec,
): Promise<void> {
  const sess = await ensureSession(spec);

  const headers: http.OutgoingHttpHeaders = {};
  for (const [k, v] of Object.entries(reqHeaders)) {
    if (["host", "connection", "transfer-encoding"].includes(k)) continue;
    headers[k] = v;
  }
  headers["host"] = spec.host;
  if (body.length) headers["content-length"] = body.length;
  if (sess) {
    const cookieParts = [`BBOX_ID=${sess.bboxId}`];
    if (sess.btoken) cookieParts.push(`btoken=${sess.btoken}`);
    headers["cookie"] = cookieParts.join("; ");
  }

  let reqPath = rawPath;
  if (["POST", "PUT", "DELETE"].includes(method) && sess?.btoken) {
    const sep = reqPath.includes("?") ? "&" : "?";
    reqPath += `${sep}btoken=${encodeURIComponent(sess.btoken)}`;
  }

  console.log(`[proxy:${spec.name}] ${method} ${reqPath}`);

  const captured: Captured = { bboxId: sess?.bboxId ?? "", btoken: sess?.btoken ?? "" };

  let statusCode: number;
  let responseHeaders: http.IncomingHttpHeaders;
  let responseBody: Buffer;

  try {
    ({ statusCode, headers: responseHeaders, body: responseBody } = await makeRequestAsync(
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
      body,
      captured,
    ));
  } catch (err) {
    console.error(`[proxy:${spec.name}] ${method} ${reqPath} → 502`, (err as Error).message);
    res.writeHead(502);
    res.end(`Proxy error: ${(err as Error).message}`);
    return;
  }

  const currentSession = getSession(spec.name);
  if (captured.bboxId && currentSession) currentSession.bboxId = captured.bboxId;
  if (captured.btoken && currentSession) currentSession.btoken = captured.btoken;

  console.log(`[proxy:${spec.name}] ${method} ${reqPath} → ${statusCode}`);

  if ((statusCode === 401 || statusCode === 403) && !retry) {
    console.log(`[proxy:${spec.name}] Token expiré, re-authentification…`);
    clearSession(spec.name);
    await ensureSession(spec);
    const newBtoken = (getSession(spec.name) as Session | null)?.btoken;
    console.log(`[proxy:${spec.name}] Retry ${method} avec btoken: ${newBtoken ? newBtoken.slice(0, 12) + "…" : "(vide)"}`);
    await dispatchProxy(method, rawPath, reqHeaders, body, res, true, spec);
    return;
  }

  const filtered = { ...responseHeaders };
  delete filtered["transfer-encoding"];
  delete filtered["connection"];
  delete filtered["set-cookie"];

  res.writeHead(statusCode, filtered);
  res.end(responseBody);
}

import http from "node:http";
import { BBOX_HOST, BBOX_CONNECT_HOST, targetUrl, isHttps } from "./config.ts";
import { type Captured, makeRequestAsync } from "./http-client.ts";
import { ensureSession, getSession, clearSession, type Session } from "./session.ts";

export async function proxyRequest(
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
  const rawPath = (req.url ?? "/").slice("/bbox-api".length) || "/";
  const contentType = req.headers["content-type"] ?? "";

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

  await dispatchProxy(method, rawPath, req.headers, body, res, false);
}

async function dispatchProxy(
  method: string,
  rawPath: string,
  reqHeaders: http.IncomingHttpHeaders,
  body: Buffer,
  res: http.ServerResponse,
  retry: boolean,
): Promise<void> {
  const sess = await ensureSession();

  const headers: http.OutgoingHttpHeaders = {};
  for (const [k, v] of Object.entries(reqHeaders)) {
    if (["host", "connection", "transfer-encoding"].includes(k)) continue;
    headers[k] = v;
  }
  headers["host"] = BBOX_HOST;
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

  console.log(`[proxy] ${method} ${reqPath}`);

  const captured: Captured = { bboxId: sess?.bboxId ?? "", btoken: sess?.btoken ?? "" };

  let statusCode: number;
  let responseHeaders: http.IncomingHttpHeaders;
  let responseBody: Buffer;

  try {
    ({ statusCode, headers: responseHeaders, body: responseBody } = await makeRequestAsync(
      {
        hostname: BBOX_CONNECT_HOST,
        port: targetUrl.port ? Number(targetUrl.port) : isHttps ? 443 : 80,
        path: reqPath,
        method,
        headers,
        protocol: targetUrl.protocol,
        rejectUnauthorized: false,
        servername: BBOX_HOST,
      },
      body,
      captured,
    ));
  } catch (err) {
    console.error(`[proxy] ${method} ${reqPath} → 502`, (err as Error).message);
    res.writeHead(502);
    res.end(`Proxy error: ${(err as Error).message}`);
    return;
  }

  const currentSession = getSession();
  if (captured.bboxId && currentSession) currentSession.bboxId = captured.bboxId;
  if (captured.btoken && currentSession) currentSession.btoken = captured.btoken;

  console.log(`[proxy] ${method} ${reqPath} → ${statusCode}`);

  if ((statusCode === 401 || statusCode === 403) && !retry) {
    console.log("[server] Token expiré, re-authentification…");
    clearSession();
    await ensureSession();
    const newBtoken = (getSession() as Session | null)?.btoken;
    console.log(`[server] Retry ${method} avec btoken: ${newBtoken ? newBtoken.slice(0, 12) + "…" : "(vide)"}`);
    await dispatchProxy(method, rawPath, reqHeaders, body, res, true);
    return;
  }

  const filtered = { ...responseHeaders };
  delete filtered["transfer-encoding"];
  delete filtered["connection"];
  delete filtered["set-cookie"];

  res.writeHead(statusCode, filtered);
  res.end(responseBody);
}

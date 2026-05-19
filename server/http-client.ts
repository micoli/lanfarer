import http from "node:http";
import https from "node:https";
import { isHttps } from "./config.ts";
import { VERBOSE } from "./config.ts";

export interface Captured { bboxId: string; btoken: string }

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);
const MAX_REDIRECTS  = 5;

export function extractCookieValue(setCookieHeaders: string[], name: string): string {
  const re = new RegExp(`${name}=([^;]+)`, "i");
  for (const h of setCookieHeaders) {
    const m = h.match(re);
    if (m) return m[1];
  }
  return "";
}

export function makeRequest(
  opts: https.RequestOptions,
  body: Buffer,
  depth: number,
  captured: Captured,
  resolve: (statusCode: number, headers: http.IncomingHttpHeaders, body: Buffer) => void,
  reject: (err: Error) => void,
): void {
  if (depth > MAX_REDIRECTS) { reject(new Error("Too many redirects")); return; }

  const transport = opts.protocol === "http:" ? http : https;
  const req = transport.request(opts, (res) => {
    const chunks: Buffer[] = [];
    res.on("data", (c: Buffer) => chunks.push(c));
    res.on("end", () => {
      const responseBody = Buffer.concat(chunks);
      const setCookies = res.headers["set-cookie"] ?? [];

      if (VERBOSE) {
        console.log(`[proxy] hop depth=${depth} status=${res.statusCode} path=${opts.path}`);
        if (responseBody.length) console.log(`[proxy] body:`, responseBody.toString().slice(0, 300));
      }

      const bboxId = extractCookieValue(setCookies, "BBOX_ID");
      if (bboxId) captured.bboxId = bboxId;

      const btoken = extractCookieValue(setCookies, "btoken");
      if (btoken) captured.btoken = btoken;

      if (REDIRECT_CODES.has(res.statusCode ?? 0) && res.headers.location) {
        const location = res.headers.location;
        const redirectUrl = location.startsWith("http")
          ? new URL(location)
          : new URL(location, `${opts.protocol}//${opts.hostname}`);

        const isRedirectHttps = redirectUrl.protocol === "https:";
        const redirectHeaders: http.OutgoingHttpHeaders = {
          ...(opts.headers as http.OutgoingHttpHeaders),
          host: redirectUrl.host,
        };
        const cookieParts: string[] = [];
        if (captured.bboxId) cookieParts.push(`BBOX_ID=${captured.bboxId}`);
        if (captured.btoken) cookieParts.push(`btoken=${captured.btoken}`);
        if (cookieParts.length) redirectHeaders["cookie"] = cookieParts.join("; ");

        makeRequest(
          {
            hostname: redirectUrl.hostname,
            port: redirectUrl.port ? Number(redirectUrl.port) : isRedirectHttps ? 443 : 80,
            path: redirectUrl.pathname + redirectUrl.search,
            method: res.statusCode === 303 ? "GET" : opts.method,
            headers: redirectHeaders,
            protocol: redirectUrl.protocol,
            rejectUnauthorized: false,
          },
          res.statusCode === 303 ? Buffer.alloc(0) : body,
          depth + 1,
          captured,
          resolve,
          reject,
        );
      } else {
        resolve(res.statusCode ?? 502, res.headers, responseBody);
      }
    });
    res.on("error", reject);
  });

  req.on("error", reject);
  if (body.length) req.write(body);
  req.end();
}

export function makeRequestAsync(
  opts: https.RequestOptions,
  body: Buffer,
  captured: Captured,
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: Buffer }> {
  return new Promise((resolve, reject) =>
    makeRequest(opts, body, 0, captured, (statusCode, headers, body) => resolve({ statusCode, headers, body }), reject),
  );
}

export function buildPort(): number {
  return isHttps ? 443 : 80;
}

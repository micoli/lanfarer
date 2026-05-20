import type http from "node:http";
import { login, getSession, deleteSession, parseSessionCookie, isAuthEnabled } from "../auth.ts";

function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}

function json(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body);
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(payload) });
  res.end(payload);
}

export async function handleAuthRoute(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): Promise<boolean> {
  const url = req.url ?? "/";

  if (url === "/__auth/login" && req.method === "POST") {
    const text = await readBody(req);
    let username: string;
    let password: string;
    try {
      ({ username, password } = JSON.parse(text));
      if (typeof username !== "string" || typeof password !== "string") throw new Error();
    } catch {
      json(res, 400, { error: "invalid request" });
      return true;
    }
    const token = await login(username, password);
    if (!token) {
      json(res, 401, { error: "invalid credentials" });
      return true;
    }
    res.writeHead(200, {
      "content-type": "application/json",
      "set-cookie": `session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`,
    });
    res.end(JSON.stringify({ ok: true, username }));
    return true;
  }

  if (url === "/__auth/logout" && req.method === "POST") {
    const token = parseSessionCookie(req.headers.cookie);
    if (token) deleteSession(token);
    res.writeHead(200, {
      "content-type": "application/json",
      "set-cookie": "session=; HttpOnly; Path=/; Max-Age=0",
    });
    res.end(JSON.stringify({ ok: true }));
    return true;
  }

  if (url === "/__auth/me" && req.method === "GET") {
    if (!isAuthEnabled() || isHassIngress(req)) {
      json(res, 200, { username: null, authEnabled: false });
      return true;
    }
    const token = parseSessionCookie(req.headers.cookie);
    const session = token ? getSession(token) : null;
    if (!session) {
      json(res, 401, { error: "unauthenticated" });
      return true;
    }
    json(res, 200, { username: session.username, authEnabled: true });
    return true;
  }

  return false;
}

function isHassIngress(req: http.IncomingMessage): boolean {
  return !!req.headers["x-hass-user-id"];
}

export function requireAuth(req: http.IncomingMessage, res: http.ServerResponse): boolean {
  if (!isAuthEnabled() || isHassIngress(req)) return true;
  const token = parseSessionCookie(req.headers.cookie);
  const session = token ? getSession(token) : null;
  if (!session) {
    json(res, 401, { error: "unauthenticated" });
    return false;
  }
  return true;
}

import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { login, getSession, deleteSession, parseSessionCookie, isAuthEnabled } from "../auth.ts";

function readBody(req: Request): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
  });
}

function isHassIngress(req: Request): boolean {
  return !!req.headers["x-hass-user-id"];
}

@Controller("__auth")
export class AuthController {
  @Post("login")
  async loginRoute(@Req() req: Request, @Res() res: Response): Promise<void> {
    const text = await readBody(req);
    let username: string;
    let password: string;
    try {
      ({ username, password } = JSON.parse(text) as { username: string; password: string });
      if (typeof username !== "string" || typeof password !== "string") throw new Error();
    } catch {
      res.status(400).json({ error: "invalid request" });
      return;
    }
    const token = await login(username, password);
    if (!token) {
      res.status(401).json({ error: "invalid credentials" });
      return;
    }
    res.setHeader("set-cookie", `session=${token}; HttpOnly; Path=/; SameSite=Strict; Max-Age=86400`);
    res.json({ ok: true, username });
  }

  @Post("logout")
  logoutRoute(@Req() req: Request, @Res() res: Response): void {
    const token = parseSessionCookie(req.headers.cookie);
    if (token) deleteSession(token);
    res.setHeader("set-cookie", "session=; HttpOnly; Path=/; Max-Age=0");
    res.json({ ok: true });
  }

  @Get("me")
  meRoute(@Req() req: Request, @Res() res: Response): void {
    if (!isAuthEnabled() || isHassIngress(req)) {
      res.json({ username: null, authEnabled: false });
      return;
    }
    const token = parseSessionCookie(req.headers.cookie);
    const session = token ? getSession(token) : null;
    if (!session) {
      res.status(401).json({ error: "unauthenticated" });
      return;
    }
    res.json({ username: session.username, authEnabled: true });
  }
}

import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBody,
  ApiResponse,
  ApiCookieAuth,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { login, getSession, deleteSession, parseSessionCookie, isAuthEnabled } from "../auth.ts";
import { LoginRequest, LoginResponse, MeResponse } from "../dto/index.ts";

function isHassIngress(req: Request): boolean {
  return !!req.headers["x-hass-user-id"];
}

@ApiTags("auth")
@Controller("__auth")
export class AuthController {
  @Post("login")
  @ApiOperation({ summary: "Authentification par login/mot de passe" })
  @ApiBody({ type: LoginRequest })
  @ApiOkResponse({ type: LoginResponse })
  @ApiResponse({ status: 400, description: "Corps de requête invalide" })
  @ApiResponse({ status: 401, description: "Identifiants incorrects" })
  async loginRoute(@Req() req: Request, @Res() res: Response): Promise<void> {
    const body = req.body as { username?: unknown; password?: unknown };
    let username: string;
    let password: string;
    try {
      ({ username, password } = body as { username: string; password: string });
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
  @ApiOperation({ summary: "Déconnexion — invalide le cookie de session" })
  @ApiCookieAuth("session")
  @ApiOkResponse({ schema: { properties: { ok: { type: "boolean" } } } })
  logoutRoute(@Req() req: Request, @Res() res: Response): void {
    const token = parseSessionCookie(req.headers.cookie);
    if (token) deleteSession(token);
    res.setHeader("set-cookie", "session=; HttpOnly; Path=/; Max-Age=0");
    res.json({ ok: true });
  }

  @Get("me")
  @ApiOperation({ summary: "Identité de l'utilisateur courant" })
  @ApiCookieAuth("session")
  @ApiOkResponse({ type: MeResponse })
  @ApiResponse({ status: 401, description: "Non authentifié" })
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

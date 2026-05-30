import { Injectable, CanActivate, type ExecutionContext } from "@nestjs/common";
import type { Request, Response } from "express";
import { isAuthEnabled, getSession, parseSessionCookie } from "./auth.ts";

function isHassIngress(req: Request): boolean {
  return !!req.headers["x-hass-user-id"];
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const res = context.switchToHttp().getResponse<Response>();
    if (!isAuthEnabled() || isHassIngress(req)) return true;
    const token = parseSessionCookie(req.headers.cookie);
    const session = token ? getSession(token) : null;
    if (!session) {
      res.status(401).json({ error: "unauthenticated" });
      return false;
    }
    return true;
  }
}

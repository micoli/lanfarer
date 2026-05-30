import { Controller, Get, Res } from "@nestjs/common";
import type { Response } from "express";
import { BBOX_TARGET } from "../config.ts";
import { getSession } from "../session.ts";

@Controller()
export class HealthController {
  @Get("__health")
  health(@Res() res: Response): void {
    res.json({ ok: true, hasSession: getSession() !== null, target: BBOX_TARGET });
  }
}

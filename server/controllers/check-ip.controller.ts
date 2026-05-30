import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import type http from "node:http";
import { AuthGuard } from "../auth.guard.ts";
import { handleCheckIp } from "../routes/check-ip.ts";

@Controller()
@UseGuards(AuthGuard)
export class CheckIpController {
  @Get("__check-ip")
  async checkIp(@Req() req: Request, @Res() res: Response): Promise<void> {
    await handleCheckIp(req as unknown as http.IncomingMessage, res as unknown as http.ServerResponse);
  }
}

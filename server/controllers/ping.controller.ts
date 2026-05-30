import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthGuard } from "../auth.guard.ts";
import { handlePing } from "../routes/ping.ts";

@Controller()
@UseGuards(AuthGuard)
export class PingController {
  @Get("__ping")
  async ping(@Req() req: Request, @Res() res: Response): Promise<void> {
    await handlePing(req as unknown as import("node:http").IncomingMessage, res as unknown as import("node:http").ServerResponse);
  }
}

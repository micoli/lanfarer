import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import { AuthGuard } from "../auth.guard.ts";
import { handleScan } from "../routes/scan.ts";

@Controller()
@UseGuards(AuthGuard)
export class ScanController {
  @Get("__scan")
  async scan(@Req() req: Request, @Res() res: Response): Promise<void> {
    await handleScan(req as unknown as import("node:http").IncomingMessage, res as unknown as import("node:http").ServerResponse);
  }
}

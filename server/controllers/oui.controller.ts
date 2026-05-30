import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import type http from "node:http";
import { AuthGuard } from "../auth.guard.ts";
import { handleOui } from "../routes/oui.ts";

@Controller()
@UseGuards(AuthGuard)
export class OuiController {
  @Get("__oui")
  async oui(@Req() req: Request, @Res() res: Response): Promise<void> {
    await handleOui(req as unknown as http.IncomingMessage, res as unknown as http.ServerResponse);
  }
}

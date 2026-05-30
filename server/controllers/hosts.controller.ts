import { Controller, Get, Inject, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import type http from "node:http";
import { AuthGuard } from "../auth.guard.ts";
import { handleHosts } from "../routes/hosts.ts";
import type { RouterPlugin } from "../plugin.ts";
import { PLUGINS_TOKEN } from "../plugins.token.ts";

@Controller()
@UseGuards(AuthGuard)
export class HostsController {
  constructor(@Inject(PLUGINS_TOKEN) private plugins: RouterPlugin[]) {}

  @Get("__hosts")
  async hosts(@Req() req: Request, @Res() res: Response): Promise<void> {
    await handleHosts(req as unknown as http.IncomingMessage, res as unknown as http.ServerResponse, this.plugins);
  }
}

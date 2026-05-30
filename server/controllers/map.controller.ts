import { Controller, Get, Inject, Req, Res, UseGuards } from "@nestjs/common";
import type { Request, Response } from "express";
import type http from "node:http";
import { AuthGuard } from "../auth.guard.ts";
import { createMapTopologyHandler } from "../routes/mapTopology.ts";
import type { RouterPlugin } from "../plugin.ts";
import { PLUGINS_TOKEN } from "../plugins.token.ts";

@Controller("__map")
@UseGuards(AuthGuard)
export class MapController {
  private readonly handleTopology: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;

  constructor(@Inject(PLUGINS_TOKEN) plugins: RouterPlugin[]) {
    this.handleTopology = createMapTopologyHandler(plugins);
  }

  @Get("topology")
  async topology(@Req() req: Request, @Res() res: Response): Promise<void> {
    await this.handleTopology(req as unknown as http.IncomingMessage, res as unknown as http.ServerResponse);
  }
}

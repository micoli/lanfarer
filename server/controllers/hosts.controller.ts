import { Controller, Get, Inject, Req, Res, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiCookieAuth,
  ApiProduces,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import type http from "node:http";
import { AuthGuard } from "../auth.guard.ts";
import { handleHosts } from "../routes/hosts.ts";
import type { RouterPlugin } from "../plugin.ts";
import { PLUGINS_TOKEN } from "../plugins.token.ts";

@ApiTags("server")
@ApiCookieAuth("session")
@Controller()
@UseGuards(AuthGuard)
export class HostsController {
  constructor(@Inject(PLUGINS_TOKEN) private plugins: RouterPlugin[]) {}

  @Get("__hosts")
  @ApiOperation({
    summary: "Flux SSE d'hôtes réseau agrégés depuis tous les plugins",
    description:
      "Retourne un flux Server-Sent Events.\n" +
      "- `progress` — `{ pct: number, label: string }` avancement\n" +
      "- `result` — `{ hosts: Host[] }` résultat final",
  })
  @ApiProduces("text/event-stream")
  @ApiResponse({ status: 200, description: "Flux SSE text/event-stream" })
  async hosts(@Req() req: Request, @Res() res: Response): Promise<void> {
    await handleHosts(req as unknown as http.IncomingMessage, res as unknown as http.ServerResponse, this.plugins);
  }
}

import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiCookieAuth,
  ApiProduces,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import { AuthGuard } from "../auth.guard.ts";
import { handleScan } from "../routes/scan.ts";

@ApiTags("server")
@ApiCookieAuth("session")
@Controller()
@UseGuards(AuthGuard)
export class ScanController {
  @Get("__scan")
  @ApiOperation({
    summary: "Scan réseau — flux SSE",
    description:
      "Retourne un flux Server-Sent Events.\n" +
      "- `progress` — `{ done, total }` avancement\n" +
      "- `host` — hôte découvert (ping + MAC + vendor)\n" +
      "- `host-detail` — détails (ports ouverts, mDNS, SMB)\n" +
      "- `done` — fin du scan\n" +
      "- `error` — erreur fatale",
  })
  @ApiQuery({
    name: "subnet",
    required: false,
    description: "CIDR à scanner (ex. 192.168.1.0/24). Détecté automatiquement si absent.",
    example: "192.168.1.0/24",
  })
  @ApiProduces("text/event-stream")
  @ApiResponse({ status: 200, description: "Flux SSE text/event-stream" })
  async scan(@Req() req: Request, @Res() res: Response): Promise<void> {
    await handleScan(req as unknown as import("node:http").IncomingMessage, res as unknown as import("node:http").ServerResponse);
  }
}

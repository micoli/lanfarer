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
import { handlePing } from "../routes/ping.ts";

@ApiTags("server")
@ApiCookieAuth("session")
@Controller()
@UseGuards(AuthGuard)
export class PingController {
  @Get("__ping")
  @ApiOperation({
    summary: "Ping continu — flux SSE",
    description:
      "Envoie des pings ICMP en boucle. Événement `ping` émis à chaque cycle :\n" +
      "`{ ip: string, rtt: number | null }[]` — null si l'hôte est injoignable.",
  })
  @ApiQuery({
    name: "ips",
    required: true,
    description: "Liste d'IP séparées par des virgules",
    example: "192.168.1.1,192.168.1.10",
  })
  @ApiProduces("text/event-stream")
  @ApiResponse({ status: 200, description: "Flux SSE text/event-stream" })
  @ApiResponse({ status: 400, description: "Aucune IP fournie" })
  async ping(@Req() req: Request, @Res() res: Response): Promise<void> {
    await handlePing(req as unknown as import("node:http").IncomingMessage, res as unknown as import("node:http").ServerResponse);
  }
}

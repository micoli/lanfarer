import { Controller, Get, Req, Res, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiResponse,
  ApiCookieAuth,
} from "@nestjs/swagger";
import type { Request, Response } from "express";
import type http from "node:http";
import { AuthGuard } from "../auth.guard.ts";
import { handleCheckIp } from "../routes/check-ip.ts";
import { CheckIpResponse } from "../dto/index.ts";

@ApiTags("server")
@ApiCookieAuth("session")
@Controller()
@UseGuards(AuthGuard)
export class CheckIpController {
  @Get("__check-ip")
  @ApiOperation({ summary: "Vérifie si une IP est joignable et résout son adresse MAC" })
  @ApiQuery({
    name: "ip",
    required: true,
    description: "Adresse IPv4 à tester",
    example: "192.168.1.10",
    schema: { type: "string", pattern: "^\\d{1,3}(\\.\\d{1,3}){3}$" },
  })
  @ApiOkResponse({ type: CheckIpResponse })
  @ApiResponse({ status: 400, description: "Format d'IP invalide" })
  async checkIp(@Req() req: Request, @Res() res: Response): Promise<void> {
    await handleCheckIp(req as unknown as http.IncomingMessage, res as unknown as http.ServerResponse);
  }
}

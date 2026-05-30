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
import { handleOui } from "../routes/oui.ts";
import { OuiResponse } from "../dto/index.ts";

@ApiTags("server")
@ApiCookieAuth("session")
@Controller()
@UseGuards(AuthGuard)
export class OuiController {
  @Get("__oui")
  @ApiOperation({ summary: "Résolution du fabricant depuis les 3 premiers octets d'une adresse MAC" })
  @ApiQuery({
    name: "mac",
    required: true,
    description: "Adresse MAC complète (tous formats acceptés)",
    example: "AA:BB:CC:DD:EE:FF",
  })
  @ApiOkResponse({ type: OuiResponse })
  @ApiResponse({ status: 400, description: "Paramètre mac manquant ou invalide" })
  async oui(@Req() req: Request, @Res() res: Response): Promise<void> {
    await handleOui(req as unknown as http.IncomingMessage, res as unknown as http.ServerResponse);
  }
}

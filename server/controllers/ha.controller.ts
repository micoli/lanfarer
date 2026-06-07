import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiResponse, ApiCookieAuth } from "@nestjs/swagger";
import type { Response } from "express";
import type http from "node:http";
import { AuthGuard } from "../auth.guard.ts";
import { HaHistoryData } from "../dto/index.ts";
import { handleHaHistory } from "../routes/ha-history.ts";

@ApiTags("server")
@ApiCookieAuth("session")
@Controller("__ha")
@UseGuards(AuthGuard)
export class HaController {
  @Get("history")
  @ApiOperation({ summary: "Historique de présence Home Assistant pour une adresse MAC" })
  @ApiQuery({ name: "mac", required: true, description: "Adresse MAC (tous formats acceptés)" })
  @ApiQuery({ name: "days", required: false, description: "Nombre de jours (1-30, défaut: 3)", example: 3 })
  @ApiOkResponse({ type: HaHistoryData })
  @ApiResponse({ status: 400, description: "mac manquant" })
  @ApiResponse({ status: 503, description: "Home Assistant non configuré" })
  async history(
    @Query("mac") _mac: string,
    @Query("days") _days: string,
    @Res() res: Response,
  ): Promise<void> {
    await handleHaHistory(
      res.req as unknown as http.IncomingMessage & { url: string },
      res as unknown as http.ServerResponse,
    );
  }
}

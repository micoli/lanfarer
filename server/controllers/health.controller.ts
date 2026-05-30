import { Controller, Get, Res } from "@nestjs/common";
import { ApiOperation, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import type { Response } from "express";
import { BBOX_TARGET } from "../config.ts";
import { getSession } from "../session.ts";
import { HealthResponse } from "../dto/index.ts";

@ApiTags("server")
@Controller()
export class HealthController {
  @Get("__health")
  @ApiOperation({ summary: "État du serveur et de la session BBox" })
  @ApiOkResponse({ type: HealthResponse })
  health(@Res() res: Response): void {
    res.json({ ok: true, hasSession: getSession() !== null, target: BBOX_TARGET });
  }
}

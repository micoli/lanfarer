import { Controller, Get, Res, UseGuards } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiCookieAuth,
} from "@nestjs/swagger";
import type { Response } from "express";
import type http from "node:http";
import { AuthGuard } from "../auth.guard.ts";
import { handleUiConfig } from "../routes/ui-config.ts";
import { handleRouters } from "../routes/routers.ts";
import { RouterEntry, UiConfig } from "../dto/index.ts";

@ApiTags("config")
@ApiCookieAuth("session")
@Controller("__config")
@UseGuards(AuthGuard)
export class RouterConfigController {
  @Get("ui")
  @ApiOperation({ summary: "Configuration UI (menu latéral, widgets, DHCP)" })
  @ApiOkResponse({ type: UiConfig })
  uiConfig(@Res() res: Response): void {
    handleUiConfig({} as http.IncomingMessage, res as unknown as http.ServerResponse);
  }

  @Get("routers")
  @ApiOperation({ summary: "Liste tous les routeurs activés dans config.yaml" })
  @ApiOkResponse({ type: RouterEntry, isArray: true })
  routers(@Res() res: Response): void {
    handleRouters({} as http.IncomingMessage, res as unknown as http.ServerResponse);
  }
}

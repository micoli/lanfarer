import { Controller, Get, Res, UseGuards } from "@nestjs/common";
import type { Response } from "express";
import type http from "node:http";
import { AuthGuard } from "../auth.guard.ts";
import { handleUiConfig } from "../routes/ui-config.ts";
import { handleRouters } from "../routes/routers.ts";

@Controller("__config")
@UseGuards(AuthGuard)
export class RouterConfigController {
  @Get("ui")
  uiConfig(@Res() res: Response): void {
    handleUiConfig({} as http.IncomingMessage, res as unknown as http.ServerResponse);
  }

  @Get("routers")
  routers(@Res() res: Response): void {
    handleRouters({} as http.IncomingMessage, res as unknown as http.ServerResponse);
  }
}

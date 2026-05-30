import { All, Controller, Inject, Next, Req, Res, UseGuards } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import type { NextFunction, Request, Response } from "express";
import type http from "node:http";
import { AuthGuard } from "../auth.guard.ts";
import type { RouterPlugin } from "../plugin.ts";
import { PLUGINS_TOKEN } from "../plugins.token.ts";

// Routes documentées dans server/openapi-plugins.yaml — catch-all non annotable individuellement
@ApiExcludeController()
@Controller("devices/api-proxy")
@UseGuards(AuthGuard)
export class PluginProxyController {
  constructor(@Inject(PLUGINS_TOKEN) private plugins: RouterPlugin[]) {}

  @All("*")
  async proxy(@Req() req: Request, @Res() res: Response, @Next() next: NextFunction): Promise<void> {
    // NestJS/Express strips the controller prefix from req.url in sub-routers;
    // req.originalUrl always has the full path that plugins expect.
    const url = req.originalUrl.split("?")[0];
    req.url = req.originalUrl;
    for (const plugin of this.plugins) {
      if (plugin.matches(url)) {
        await plugin.handle(req as unknown as http.IncomingMessage, res as unknown as http.ServerResponse);
        return;
      }
    }
    next();
  }
}

import { Module } from "@nestjs/common";
import { PLUGINS_TOKEN } from "./plugins.token.ts";
import { HealthController } from "./controllers/health.controller.ts";
import { AuthController } from "./controllers/auth.controller.ts";
import { ScanController } from "./controllers/scan.controller.ts";
import { PingController } from "./controllers/ping.controller.ts";
import { HostsController } from "./controllers/hosts.controller.ts";
import { MapController } from "./controllers/map.controller.ts";
import { CheckIpController } from "./controllers/check-ip.controller.ts";
import { OuiController } from "./controllers/oui.controller.ts";
import { RouterConfigController } from "./controllers/router-config.controller.ts";
import { PluginProxyController } from "./controllers/plugin-proxy.controller.ts";
import { ProbeController } from "./controllers/probe.controller.ts";

@Module({
  providers: [{ provide: PLUGINS_TOKEN, useValue: [] }],
  controllers: [
    HealthController,
    AuthController,
    ScanController,
    PingController,
    HostsController,
    MapController,
    CheckIpController,
    OuiController,
    RouterConfigController,
    PluginProxyController,
    ProbeController,
  ],
})
export class OpenApiAppModule {}

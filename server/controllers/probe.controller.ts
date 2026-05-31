import { Controller, Get, Query, Res, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiOkResponse, ApiQuery, ApiResponse, ApiCookieAuth } from "@nestjs/swagger";
import type { Response } from "express";
import { AuthGuard } from "../auth.guard.ts";
import { ProbeResult } from "../dto/index.ts";
import { probeHostDetails } from "../host-probe.ts";

@ApiTags("server")
@ApiCookieAuth("session")
@Controller("__probe")
@UseGuards(AuthGuard)
export class ProbeController {
  @Get()
  @ApiOperation({ summary: "Sonde un hôte (ports ouverts, mDNS, SMB, ping stats)" })
  @ApiQuery({ name: "ip", required: true, description: "Adresse IPv4 à sonder", example: "192.168.1.10" })
  @ApiOkResponse({ type: ProbeResult })
  @ApiResponse({ status: 400, description: "IP manquante ou invalide" })
  async probe(@Query("ip") ip: string, @Res() res: Response): Promise<void> {
    if (!ip) {
      res.status(400).json({ error: "ip required" });
      return;
    }
    const result = await probeHostDetails(ip, "");
    res.json(result);
  }
}

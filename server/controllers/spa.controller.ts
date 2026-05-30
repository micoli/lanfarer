import { All, Controller, Next, Req, Res } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";

@Controller()
export class SpaController {
  @All("*")
  fallthrough(@Req() _req: Request, @Res() _res: Response, @Next() next: NextFunction): void {
    next();
  }
}

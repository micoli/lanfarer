import http from "node:http";

export async function readJsonBody(req: http.IncomingMessage): Promise<Record<string, unknown>> {
  // Express/NestJS body parser may have already consumed the stream
  const expressBody = (req as unknown as { body?: unknown }).body;
  if (expressBody !== null && expressBody !== undefined && typeof expressBody === "object") {
    return expressBody as Record<string, unknown>;
  }
  const chunks: Buffer[] = [];
  await new Promise<void>((res) => {
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", res);
  });
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function sendJson(res: http.ServerResponse, statusCode: number, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "content-type": "application/json",
    "content-length": Buffer.byteLength(body),
  });
  res.end(body);
}

export function sendError(res: http.ServerResponse, statusCode: number, message: string): void {
  sendJson(res, statusCode, { error: message });
}

export function sendStatus(res: http.ServerResponse, statusCode: number): void {
  res.writeHead(statusCode);
  res.end();
}

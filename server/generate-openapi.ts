import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { OpenApiAppModule } from "./openapi-app.module.ts";
import { parse, stringify } from "yaml";
import fs from "node:fs";
import path from "node:path";
import * as Dto from "./dto/index.ts";

const PLUGINS_YAML = path.resolve("server/openapi-plugins.yaml");
const OUTPUT_YAML  = path.resolve("openapi.yaml");

async function generate() {
  const app = await NestFactory.create(OpenApiAppModule, { logger: false });

  const config = new DocumentBuilder()
    .setTitle("fast5688b-gui server API")
    .setVersion("2.0.0")
    .setDescription(
      "API exposée par le serveur Node.js fast5688b.\n" +
      "Toutes les routes plugin suivent le schéma :\n" +
      "  /devices/api-proxy/{type}-proxy/{routerId}/{resource}",
    )
    .addServer("http://localhost:5176")
    .addCookieAuth("session")
    .build();

  // All DTO classes must be registered so $refs from openapi-plugins.yaml resolve
  const pluginOnlyModels = Object.values(Dto).filter(
    (v) => typeof v === "function" && (v as { prototype?: unknown }).prototype !== undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ) as any[];

  const document = SwaggerModule.createDocument(app, config, { extraModels: pluginOnlyModels });

  // Merge plugin paths and parameters from openapi-plugins.yaml
  const pluginsRaw = fs.readFileSync(PLUGINS_YAML, "utf8");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const plugins = parse(pluginsRaw) as any;

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  document.paths = { ...document.paths, ...(plugins.paths ?? {}) };

  document.components ??= {};

  if (plugins.components?.parameters) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    document.components.parameters = {
      ...document.components.parameters,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ...plugins.components.parameters,
    };
  }

  if (plugins.components?.schemas) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    document.components.schemas = {
      ...document.components.schemas,
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      ...plugins.components.schemas,
    };
  }

  // Remove internal NestJS paths (SPA fallback etc.)
  for (const p of Object.keys(document.paths ?? {})) {
    if (!p.startsWith("/__") && !p.startsWith("/devices/")) {
      // biome-ignore lint/performance/noDelete: removing from swagger doc
      delete document.paths[p];
    }
  }

  const yaml = stringify(document, { lineWidth: 0 });
  fs.writeFileSync(OUTPUT_YAML, yaml);
  console.log(`[openapi] ${OUTPUT_YAML} généré`);

  await app.close();
  process.exit(0);
}

generate().catch((err: unknown) => {
  console.error("[openapi] Erreur:", err);
  process.exit(1);
});

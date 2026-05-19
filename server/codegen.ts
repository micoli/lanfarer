import { exec } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

export async function runCodegen(): Promise<void> {
  const start = Date.now();
  try {
    await execAsync(
      "node_modules/.bin/openapi-typescript openapi.yaml -o src/lib/api/schema.d.ts",
    );
    console.log(`[codegen] schema.d.ts généré (${Date.now() - start}ms)`);
  } catch (err) {
    console.error("[codegen] Échec :", (err as Error).message);
  }
}

import createClient from "openapi-fetch";
import type { paths } from "./schema.d.ts";
import { basePath } from "../basePath.ts";

export const apiClient = createClient<paths>({ baseUrl: `${basePath()}/` });

export class BboxApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "BboxApiError";
  }
}

type FetchResult<T> = Promise<{ data?: T; error?: unknown; response: Response }>;

export async function apiFetch<T>(promise: FetchResult<T>): Promise<T> {
  const { data, error, response } = await promise;
  if (!response.ok || error) {
    throw new BboxApiError(response.status, `Erreur API ${response.status}`);
  }
  // Detect BBox in-band 401 (router returns 200 with exception code in body)
  const candidate = data as
    | { exception?: { code: unknown } }
    | Array<{ exception?: { code: unknown } }>
    | undefined;
  const code = Array.isArray(candidate)
    ? candidate[0]?.exception?.code
    : candidate?.exception?.code;
  if (code === "401" || code === 401) {
    throw new BboxApiError(401, "Session expirée");
  }
  return data as T;
}

export class BboxApiError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
    this.name = "BboxApiError";
  }
}

export async function bboxFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/bbox-api/${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...(options?.headers as Record<string, string> | undefined),
    },
  });

  const text = await res.text();
  console.debug(`[bbox] ${options?.method ?? "GET"} /${path} →`, res.status, text.slice(0, 300));

  if (!res.ok) {
    throw new BboxApiError(res.status, `Erreur API ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!text) return undefined as T;

  const json = JSON.parse(text);

  const code = json?.exception?.code ?? json?.[0]?.exception?.code;
  if (code === "401" || code === 401) {
    throw new BboxApiError(401, "Session expirée");
  }

  return json as T;
}

export async function bboxPut(path: string, body: Record<string, string | number>): Promise<void> {
  await bboxFetch<void>(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function bboxPost(path: string, body: Record<string, string | number>): Promise<void> {
  await bboxFetch<void>(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function bboxDelete(path: string): Promise<void> {
  await bboxFetch<void>(path, { method: "DELETE" });
}

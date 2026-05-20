// Reads the <base href> injected by the server (X-Ingress-Path under HA ingress).
// Returns "" at root, "/api/hassio_ingress/TOKEN" under HA ingress.
export function basePath(): string {
  return new URL(document.baseURI).pathname.replace(/\/+$/, "");
}

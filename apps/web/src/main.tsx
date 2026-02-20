import { createRouter } from "./app/router";

export function bootWebClient(): string {
  const router = createRouter();
  return `web-client-ready:${router.routes.length}`;
}

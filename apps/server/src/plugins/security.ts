import { type FastifyInstance } from "fastify";

export function registerSecurityPlugin(app: FastifyInstance): void {
  app.addHook("onSend", async (_request, reply, payload) => {
    reply.header("x-content-type-options", "nosniff");
    reply.header("x-frame-options", "DENY");
    reply.header("x-xss-protection", "1; mode=block");
    reply.header("referrer-policy", "no-referrer");
    return payload;
  });
}

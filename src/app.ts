import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import jwt from "@fastify/jwt";
import staticFiles from "@fastify/static";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import { registerAuditRoutes } from "../apps/server/src/modules/audit/audit.routes";
import { registerAuthRoutes } from "../apps/server/src/modules/auth/auth.routes";
import { registerCatalogRoutes } from "../apps/server/src/modules/catalogs/catalogs.routes";
import { registerDocumentRoutes } from "../apps/server/src/modules/documents/documents.routes";
import { registerMetadataRoutes } from "../apps/server/src/modules/metadata/metadata.routes";
import {
  type ModuleDeps,
  type RequestContext
} from "../apps/server/src/modules/module-types";
import { registerRegisterRoutes } from "../apps/server/src/modules/registers/registers.routes";
import { registerScriptingRoutes } from "../apps/server/src/modules/scripting/scripting.routes";
import { registerSecurityPlugin } from "../apps/server/src/plugins/security";
import { readConfig } from "./config";
import { PlatformRuntime } from "./platform";

interface JwtPayload {
  username: string;
  role: string;
}

async function requireRequestContext(
  request: FastifyRequest
): Promise<RequestContext> {
  await request.jwtVerify();
  const user = request.user as JwtPayload | undefined;
  if (!user) {
    throw new Error("Missing authenticated user.");
  }
  return {
    actor: user.username,
    role: user.role
  };
}

export function createApp(runtime = new PlatformRuntime()): FastifyInstance {
  const config = readConfig();
  const app = Fastify({ logger: false });
  registerSecurityPlugin(app);
  app.register(jwt, {
    secret: config.JWT_SECRET
  });
  app.register(staticFiles, {
    root: resolve("apps/web"),
    prefix: "/"
  });
  app.addHook("onClose", async () => {
    runtime.close();
  });
  app.addHook("onRequest", async (request, reply) => {
    const requestId = randomUUID();
    reply.header("x-request-id", requestId);
    (request as FastifyRequest & { requestId: string }).requestId = requestId;
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        event: "request.start",
        requestId,
        method: request.method,
        url: request.url,
        timestamp: new Date().toISOString()
      })
    );
  });
  app.addHook("onResponse", async (request, reply) => {
    const requestId = (request as FastifyRequest & { requestId?: string }).requestId ?? "n/a";
    // eslint-disable-next-line no-console
    console.log(
      JSON.stringify({
        event: "request.finish",
        requestId,
        method: request.method,
        url: request.url,
        statusCode: reply.statusCode,
        timestamp: new Date().toISOString()
      })
    );
  });

  app.setErrorHandler((error, _request, reply) => {
    if ((error as { statusCode?: number }).statusCode === 401) {
      reply.status(401).send({
        error: "Unauthorized",
        message: "Authentication required."
      });
      return;
    }
    reply.status(400).send({
      error: "BadRequest",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  });

  app.get("/health", async () => {
    return { ok: true, service: "1c-enterprise-clone" };
  });

  app.get("/", async (_request, reply) => {
    return reply.sendFile("index.html");
  });

  const moduleDeps: ModuleDeps = {
    runtime,
    requireRequestContext
  };

  registerAuthRoutes(app);
  registerMetadataRoutes(app, moduleDeps);
  registerCatalogRoutes(app, moduleDeps);
  registerDocumentRoutes(app, moduleDeps);
  registerRegisterRoutes(app, moduleDeps);
  registerAuditRoutes(app, moduleDeps);
  registerScriptingRoutes(app, moduleDeps);

  return app;
}

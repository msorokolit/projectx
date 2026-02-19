import Fastify, { type FastifyInstance, type FastifyRequest } from "fastify";
import jwt from "@fastify/jwt";
import { loginPayloadSchema, validateCredentials } from "./auth";
import { parseMetadata } from "./metadata";
import { PlatformRuntime } from "./platform";

interface RequestContext {
  actor: string;
  role: string;
}

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
  const app = Fastify({ logger: false });
  app.register(jwt, {
    secret: process.env.JWT_SECRET ?? "dev-local-secret"
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

  app.post<{ Body: unknown }>("/api/auth/login", async (request) => {
    const body = loginPayloadSchema.parse(request.body);
    const user = validateCredentials(body.username, body.password);
    if (!user) {
      throw new Error("Invalid credentials.");
    }
    const token = app.jwt.sign({
      username: user.username,
      role: user.role
    });
    return {
      accessToken: token,
      user
    };
  });

  app.post<{ Body: unknown }>("/api/metadata/load", async (request) => {
    const context = await requireRequestContext(request);
    const metadata = parseMetadata(request.body);
    runtime.setMetadata(metadata, context.actor);
    return { ok: true, name: metadata.name, version: metadata.version };
  });

  app.get("/api/metadata", async (request) => {
    await requireRequestContext(request);
    return runtime.getMetadata();
  });

  app.get("/api/metadata/sql-preview", async (request) => {
    await requireRequestContext(request);
    return { statements: runtime.getMetadataSqlPreview() };
  });

  app.get("/api/metadata/migrations", async (request) => {
    const context = await requireRequestContext(request);
    if (context.role !== "Admin") {
      throw new Error("Only Admin can read metadata migration history.");
    }
    return runtime.getMetadataMigrationHistory();
  });

  app.get<{ Params: { catalog: string } }>("/api/catalog/:catalog", async (request) => {
    const context = await requireRequestContext(request);
    runtime.assertPermission(context.role, "catalog", request.params.catalog, "read");
    return runtime.listCatalogRecords(request.params.catalog);
  });

  app.get<{ Params: { catalog: string; id: string } }>(
    "/api/catalog/:catalog/:id",
    async (request) => {
      const context = await requireRequestContext(request);
      runtime.assertPermission(context.role, "catalog", request.params.catalog, "read");
      return runtime.getCatalogRecord(request.params.catalog, request.params.id);
    }
  );

  app.post<{ Params: { catalog: string }; Body: Record<string, unknown> }>(
    "/api/catalog/:catalog",
    async (request) => {
      const context = await requireRequestContext(request);
      return runtime.upsertCatalogRecord(
        context.actor,
        context.role,
        request.params.catalog,
        request.body
      );
    }
  );

  app.put<{ Params: { catalog: string; id: string }; Body: Record<string, unknown> }>(
    "/api/catalog/:catalog/:id",
    async (request) => {
      const context = await requireRequestContext(request);
      return runtime.upsertCatalogRecord(
        context.actor,
        context.role,
        request.params.catalog,
        request.body,
        request.params.id
      );
    }
  );

  app.get<{ Params: { document: string } }>("/api/document/:document", async (request) => {
    const context = await requireRequestContext(request);
    runtime.assertPermission(context.role, "document", request.params.document, "read");
    return runtime.listDocuments(request.params.document);
  });

  app.get<{ Params: { document: string; id: string } }>(
    "/api/document/:document/:id",
    async (request) => {
      const context = await requireRequestContext(request);
      runtime.assertPermission(context.role, "document", request.params.document, "read");
      return runtime.getDocument(request.params.document, request.params.id);
    }
  );

  app.post<{ Params: { document: string }; Body: Record<string, unknown> }>(
    "/api/document/:document",
    async (request) => {
      const context = await requireRequestContext(request);
      return runtime.upsertDocument(
        context.actor,
        context.role,
        request.params.document,
        request.body
      );
    }
  );

  app.put<{ Params: { document: string; id: string }; Body: Record<string, unknown> }>(
    "/api/document/:document/:id",
    async (request) => {
      const context = await requireRequestContext(request);
      return runtime.upsertDocument(
        context.actor,
        context.role,
        request.params.document,
        request.body,
        request.params.id
      );
    }
  );

  app.post<{ Params: { document: string; id: string } }>(
    "/api/document/:document/:id/post",
    async (request) => {
      const context = await requireRequestContext(request);
      return runtime.postDocument(
        context.actor,
        context.role,
        request.params.document,
        request.params.id
      );
    }
  );

  app.post<{ Params: { document: string; id: string } }>(
    "/api/document/:document/:id/unpost",
    async (request) => {
      const context = await requireRequestContext(request);
      return runtime.unpostDocument(
        context.actor,
        context.role,
        request.params.document,
        request.params.id
      );
    }
  );

  app.get<{ Params: { register: string } }>(
    "/api/register/:register/movements",
    async (request) => {
      const context = await requireRequestContext(request);
      runtime.assertPermission(context.role, "register", request.params.register, "read");
      return runtime.getRegisterMovements(request.params.register);
    }
  );

  app.get<{ Params: { register: string }; Querystring: Record<string, unknown> }>(
    "/api/register/:register/balance",
    async (request) => {
      const context = await requireRequestContext(request);
      runtime.assertPermission(context.role, "register", request.params.register, "read");
      return runtime.getRegisterBalance(
        request.params.register,
        request.query as Record<string, unknown>
      );
    }
  );

  app.get("/api/audit", async (request) => {
    const context = await requireRequestContext(request);
    if (context.role !== "Admin") {
      throw new Error("Only Admin can read audit log.");
    }
    return runtime.getAuditLog();
  });

  return app;
}

import Fastify, { type FastifyInstance } from "fastify";
import { parseMetadata } from "./metadata";
import { PlatformRuntime } from "./platform";

interface RequestContext {
  actor: string;
  role: string;
}

function getRequestContext(headers: Record<string, unknown>): RequestContext {
  const actorHeader = headers["x-user"];
  const roleHeader = headers["x-role"];
  return {
    actor: typeof actorHeader === "string" && actorHeader.trim() ? actorHeader : "anonymous",
    role: typeof roleHeader === "string" && roleHeader.trim() ? roleHeader : "Admin"
  };
}

export function createApp(runtime = new PlatformRuntime()): FastifyInstance {
  const app = Fastify({ logger: false });

  app.setErrorHandler((error, _request, reply) => {
    reply.status(400).send({
      error: "BadRequest",
      message: error instanceof Error ? error.message : "Unknown error"
    });
  });

  app.get("/health", async () => {
    return { ok: true, service: "1c-enterprise-clone" };
  });

  app.post<{ Body: unknown }>("/api/metadata/load", async (request) => {
    const context = getRequestContext(request.headers as Record<string, unknown>);
    const metadata = parseMetadata(request.body);
    runtime.setMetadata(metadata, context.actor);
    return { ok: true, name: metadata.name, version: metadata.version };
  });

  app.get("/api/metadata", async () => runtime.getMetadata());

  app.get("/api/metadata/sql-preview", async () => {
    return { statements: runtime.getMetadataSqlPreview() };
  });

  app.get("/api/metadata/migrations", async (request) => {
    const context = getRequestContext(request.headers as Record<string, unknown>);
    if (context.role !== "Admin") {
      throw new Error("Only Admin can read metadata migration history.");
    }
    return runtime.getMetadataMigrationHistory();
  });

  app.get<{ Params: { catalog: string } }>("/api/catalog/:catalog", async (request) => {
    const context = getRequestContext(request.headers as Record<string, unknown>);
    runtime.assertPermission(context.role, "catalog", request.params.catalog, "read");
    return runtime.listCatalogRecords(request.params.catalog);
  });

  app.get<{ Params: { catalog: string; id: string } }>(
    "/api/catalog/:catalog/:id",
    async (request) => {
      const context = getRequestContext(request.headers as Record<string, unknown>);
      runtime.assertPermission(context.role, "catalog", request.params.catalog, "read");
      return runtime.getCatalogRecord(request.params.catalog, request.params.id);
    }
  );

  app.post<{ Params: { catalog: string }; Body: Record<string, unknown> }>(
    "/api/catalog/:catalog",
    async (request) => {
      const context = getRequestContext(request.headers as Record<string, unknown>);
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
      const context = getRequestContext(request.headers as Record<string, unknown>);
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
    const context = getRequestContext(request.headers as Record<string, unknown>);
    runtime.assertPermission(context.role, "document", request.params.document, "read");
    return runtime.listDocuments(request.params.document);
  });

  app.get<{ Params: { document: string; id: string } }>(
    "/api/document/:document/:id",
    async (request) => {
      const context = getRequestContext(request.headers as Record<string, unknown>);
      runtime.assertPermission(context.role, "document", request.params.document, "read");
      return runtime.getDocument(request.params.document, request.params.id);
    }
  );

  app.post<{ Params: { document: string }; Body: Record<string, unknown> }>(
    "/api/document/:document",
    async (request) => {
      const context = getRequestContext(request.headers as Record<string, unknown>);
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
      const context = getRequestContext(request.headers as Record<string, unknown>);
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
      const context = getRequestContext(request.headers as Record<string, unknown>);
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
      const context = getRequestContext(request.headers as Record<string, unknown>);
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
      const context = getRequestContext(request.headers as Record<string, unknown>);
      runtime.assertPermission(context.role, "register", request.params.register, "read");
      return runtime.getRegisterMovements(request.params.register);
    }
  );

  app.get<{ Params: { register: string }; Querystring: Record<string, unknown> }>(
    "/api/register/:register/balance",
    async (request) => {
      const context = getRequestContext(request.headers as Record<string, unknown>);
      runtime.assertPermission(context.role, "register", request.params.register, "read");
      return runtime.getRegisterBalance(
        request.params.register,
        request.query as Record<string, unknown>
      );
    }
  );

  app.get("/api/audit", async (request) => {
    const context = getRequestContext(request.headers as Record<string, unknown>);
    if (context.role !== "Admin") {
      throw new Error("Only Admin can read audit log.");
    }
    return runtime.getAuditLog();
  });

  return app;
}

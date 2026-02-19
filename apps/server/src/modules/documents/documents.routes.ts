import { type FastifyInstance } from "fastify";
import { type ModuleDeps } from "../module-types";
import { DocumentsService } from "./documents.service";

export function registerDocumentRoutes(app: FastifyInstance, deps: ModuleDeps): void {
  const service = new DocumentsService(deps);

  app.get<{ Params: { document: string } }>("/api/document/:document", async (request) => {
    const context = await deps.requireRequestContext(request);
    return service.list(request.params.document, context);
  });

  app.get<{ Params: { document: string; id: string } }>(
    "/api/document/:document/:id",
    async (request) => {
      const context = await deps.requireRequestContext(request);
      return service.get(request.params.document, request.params.id, context);
    }
  );

  app.post<{ Params: { document: string }; Body: Record<string, unknown> }>(
    "/api/document/:document",
    async (request) => {
      const context = await deps.requireRequestContext(request);
      return service.create(request.params.document, request.body, context);
    }
  );

  app.put<{ Params: { document: string; id: string }; Body: Record<string, unknown> }>(
    "/api/document/:document/:id",
    async (request) => {
      const context = await deps.requireRequestContext(request);
      return service.update(request.params.document, request.params.id, request.body, context);
    }
  );

  app.post<{ Params: { document: string; id: string } }>(
    "/api/document/:document/:id/post",
    async (request) => {
      const context = await deps.requireRequestContext(request);
      return service.post(request.params.document, request.params.id, context);
    }
  );

  app.post<{ Params: { document: string; id: string } }>(
    "/api/document/:document/:id/unpost",
    async (request) => {
      const context = await deps.requireRequestContext(request);
      return service.unpost(request.params.document, request.params.id, context);
    }
  );
}

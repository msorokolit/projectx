import { type FastifyInstance } from "fastify";
import { type ModuleDeps } from "../module-types";
import { CatalogsService } from "./catalogs.service";

export function registerCatalogRoutes(app: FastifyInstance, deps: ModuleDeps): void {
  const service = new CatalogsService(deps);

  app.get<{ Params: { catalog: string } }>("/api/catalog/:catalog", async (request) => {
    const context = await deps.requireRequestContext(request);
    return service.list(request.params.catalog, context);
  });

  app.get<{ Params: { catalog: string; id: string } }>(
    "/api/catalog/:catalog/:id",
    async (request) => {
      const context = await deps.requireRequestContext(request);
      return service.get(request.params.catalog, request.params.id, context);
    }
  );

  app.post<{ Params: { catalog: string }; Body: Record<string, unknown> }>(
    "/api/catalog/:catalog",
    async (request) => {
      const context = await deps.requireRequestContext(request);
      return service.create(request.params.catalog, request.body, context);
    }
  );

  app.put<{ Params: { catalog: string; id: string }; Body: Record<string, unknown> }>(
    "/api/catalog/:catalog/:id",
    async (request) => {
      const context = await deps.requireRequestContext(request);
      return service.update(request.params.catalog, request.params.id, request.body, context);
    }
  );
}

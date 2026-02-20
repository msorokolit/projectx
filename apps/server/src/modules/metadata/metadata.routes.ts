import { type FastifyInstance } from "fastify";
import { type ModuleDeps } from "../module-types";
import { MetadataService } from "./metadata.service";

export function registerMetadataRoutes(app: FastifyInstance, deps: ModuleDeps): void {
  const metadataService = new MetadataService(deps);

  app.post<{ Body: unknown }>("/api/metadata/load", async (request) => {
    const context = await deps.requireRequestContext(request);
    return metadataService.load(request.body, context);
  });

  app.get("/api/metadata", async (request) => {
    await deps.requireRequestContext(request);
    return metadataService.get();
  });

  app.get("/api/metadata/sql-preview", async (request) => {
    await deps.requireRequestContext(request);
    return metadataService.getSqlPreview();
  });

  app.get("/api/metadata/migrations", async (request) => {
    const context = await deps.requireRequestContext(request);
    return metadataService.getMigrations(context);
  });

  app.get("/api/metadata/db-tables", async (request) => {
    const context = await deps.requireRequestContext(request);
    return metadataService.getDbTables(context);
  });
}

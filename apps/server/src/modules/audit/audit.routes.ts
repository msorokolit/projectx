import { type FastifyInstance } from "fastify";
import { type ModuleDeps } from "../module-types";
import { AuditService } from "./audit.service";

export function registerAuditRoutes(app: FastifyInstance, deps: ModuleDeps): void {
  const service = new AuditService(deps);

  app.get("/api/audit", async (request) => {
    const context = await deps.requireRequestContext(request);
    return service.list(context);
  });
}

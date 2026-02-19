import { type FastifyInstance } from "fastify";
import { type ModuleDeps } from "../module-types";
import { ScriptingService } from "./scripting.service";

export function registerScriptingRoutes(app: FastifyInstance, deps: ModuleDeps): void {
  const service = new ScriptingService(deps);

  app.get("/api/scripting/metrics", async (request) => {
    const context = await deps.requireRequestContext(request);
    return service.metrics(context);
  });
}

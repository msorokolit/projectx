import { type FastifyInstance } from "fastify";
import { type ModuleDeps } from "../module-types";
import { DemoService } from "./demo.service";

export function registerDemoRoutes(app: FastifyInstance, deps: ModuleDeps): void {
  const service = new DemoService(deps);

  app.post("/api/demo/seed/trade-management", async (request) => {
    const context = await deps.requireRequestContext(request);
    return service.seedTradeScenario(context);
  });
}

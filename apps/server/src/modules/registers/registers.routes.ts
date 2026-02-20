import { type FastifyInstance } from "fastify";
import { type ModuleDeps } from "../module-types";
import { RegistersService } from "./registers.service";

export function registerRegisterRoutes(app: FastifyInstance, deps: ModuleDeps): void {
  const service = new RegistersService(deps);

  app.get<{ Params: { register: string } }>(
    "/api/register/:register/movements",
    async (request) => {
      const context = await deps.requireRequestContext(request);
      return service.movements(request.params.register, context);
    }
  );

  app.get<{ Params: { register: string }; Querystring: Record<string, unknown> }>(
    "/api/register/:register/balance",
    async (request) => {
      const context = await deps.requireRequestContext(request);
      return service.balance(
        request.params.register,
        request.query as Record<string, unknown>,
        context
      );
    }
  );
}

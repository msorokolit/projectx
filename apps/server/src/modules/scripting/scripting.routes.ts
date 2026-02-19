import { type FastifyInstance } from "fastify";
import { z } from "zod";
import { type ModuleDeps } from "../module-types";
import { ScriptingService } from "./scripting.service";

const scriptRegistrationSchema = z.object({
  scriptName: z.string().min(1),
  sourceCode: z.string().min(1)
});

const scriptValidationSchema = z.object({
  sourceCode: z.string().min(1)
});

export function registerScriptingRoutes(app: FastifyInstance, deps: ModuleDeps): void {
  const service = new ScriptingService(deps);

  app.get("/api/scripting/metrics", async (request) => {
    const context = await deps.requireRequestContext(request);
    return service.metrics(context);
  });

  app.get("/api/scripting/registry", async (request) => {
    const context = await deps.requireRequestContext(request);
    return service.listScripts(context);
  });

  app.post<{ Body: unknown }>("/api/scripting/registry", async (request) => {
    const context = await deps.requireRequestContext(request);
    const body = scriptRegistrationSchema.parse(request.body);
    return service.registerScript(body.scriptName, body.sourceCode, context);
  });

  app.post<{ Body: unknown }>("/api/scripting/validate", async (request) => {
    const context = await deps.requireRequestContext(request);
    const body = scriptValidationSchema.parse(request.body);
    return service.validateScript(body.sourceCode, context);
  });
}

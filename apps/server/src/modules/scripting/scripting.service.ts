import { type ModuleDeps, type RequestContext } from "../module-types";

export class ScriptingService {
  constructor(private readonly deps: ModuleDeps) {}

  metrics(context: RequestContext): unknown {
    if (context.role !== "Admin") {
      throw new Error("Only Admin can read script metrics.");
    }
    return this.deps.runtime.getScriptMetrics();
  }
}

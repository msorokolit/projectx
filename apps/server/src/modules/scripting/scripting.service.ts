import { type ModuleDeps, type RequestContext } from "../module-types";

export class ScriptingService {
  constructor(private readonly deps: ModuleDeps) {}

  private assertAdmin(context: RequestContext): void {
    if (context.role !== "Admin") {
      throw new Error("Only Admin can manage scripting.");
    }
  }

  metrics(context: RequestContext): unknown {
    this.assertAdmin(context);
    return this.deps.runtime.getScriptMetrics();
  }

  listScripts(context: RequestContext): unknown {
    this.assertAdmin(context);
    return this.deps.runtime.listScripts();
  }

  registerScript(
    scriptName: string,
    sourceCode: string,
    context: RequestContext
  ): { ok: true; scriptName: string } {
    this.assertAdmin(context);
    this.deps.runtime.registerScript(scriptName, sourceCode);
    return {
      ok: true,
      scriptName
    };
  }

  validateScript(sourceCode: string, context: RequestContext): { valid: true } {
    this.assertAdmin(context);
    return this.deps.runtime.validateScriptSource(sourceCode);
  }
}

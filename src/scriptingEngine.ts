import { Script, createContext } from "node:vm";

export interface ScriptRunOptions<TContext extends Record<string, unknown>> {
  sourceCode: string;
  context: TContext;
  timeoutMs?: number;
}

export class ScriptEngine {
  run<TContext extends Record<string, unknown>>(
    options: ScriptRunOptions<TContext>
  ): unknown {
    const timeoutMs = options.timeoutMs ?? 50;
    const script = new Script(`(${options.sourceCode})(__payload)`);
    const runtimeContext = createContext({
      Math,
      Date,
      JSON,
      __payload: options.context
    });
    return script.runInContext(runtimeContext, { timeout: timeoutMs });
  }
}

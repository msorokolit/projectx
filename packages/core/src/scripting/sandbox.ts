import { ScriptEngine } from "./engine";
import { type ScriptSandboxContext } from "./types";

const engine = new ScriptEngine();

export function runScriptInSandbox(sourceCode: string, context: ScriptSandboxContext): unknown {
  return engine.run({
    sourceCode,
    context,
    timeoutMs: 100
  });
}

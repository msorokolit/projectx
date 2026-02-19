import { Script, createContext } from "node:vm";

export interface ScriptRunOptions<TContext extends Record<string, unknown>> {
  sourceCode: string;
  context: TContext;
  timeoutMs?: number;
}

const FORBIDDEN_PATTERNS: RegExp[] = [
  /\brequire\s*\(/,
  /\bprocess\b/,
  /\bglobalThis\b/,
  /\bglobal\b/,
  /\bmodule\b/,
  /\bexports\b/,
  /\bFunction\s*\(/,
  /\beval\s*\(/,
  /\bimport\s*\(/,
  /\bnode:/,
  /\bchild_process\b/,
  /\bfs\b/,
  /\bhttp\b/,
  /\bhttps\b/,
  /\bnet\b/
];

function assertSafeSource(sourceCode: string): void {
  if (sourceCode.length > 20_000) {
    throw new Error("Hook script is too large.");
  }
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.test(sourceCode)) {
      throw new Error(`Hook script contains forbidden token: ${pattern}`);
    }
  }
}

export class ScriptEngine {
  validate(sourceCode: string): void {
    assertSafeSource(sourceCode);
    const script = new Script(`(${sourceCode})`);
    const runtimeContext = createContext({
      Math,
      Date,
      JSON
    }, {
      codeGeneration: {
        strings: false,
        wasm: false
      }
    });
    const compiled = script.runInContext(runtimeContext, { timeout: 20 });
    if (typeof compiled !== "function") {
      throw new Error("Hook script must evaluate to a function expression.");
    }
  }

  run<TContext extends Record<string, unknown>>(
    options: ScriptRunOptions<TContext>
  ): unknown {
    this.validate(options.sourceCode);
    const timeoutMs = options.timeoutMs ?? 50;
    const script = new Script(`(${options.sourceCode})(__payload)`);
    const runtimeContext = createContext({
      Math,
      Date,
      JSON,
      __payload: options.context
    }, {
      codeGeneration: {
        strings: false,
        wasm: false
      }
    });
    return script.runInContext(runtimeContext, { timeout: timeoutMs });
  }
}

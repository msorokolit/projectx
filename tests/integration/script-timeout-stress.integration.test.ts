import { describe, expect, it } from "vitest";
import { ScriptEngine } from "../../src/scriptingEngine";

describe("integration: script timeout stress", () => {
  it("terminates repeated infinite-loop scripts by timeout", () => {
    const engine = new ScriptEngine();
    const startedAt = Date.now();
    let failures = 0;

    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        engine.run({
          sourceCode: "() => { while (true) { /* burn */ } }",
          context: {},
          timeoutMs: 10
        });
      } catch {
        failures += 1;
      }
    }

    const durationMs = Date.now() - startedAt;
    expect(failures).toBe(20);
    expect(durationMs).toBeLessThan(4000);
  });
});

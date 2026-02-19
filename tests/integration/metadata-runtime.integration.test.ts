import { describe, expect, it } from "vitest";
import { bootstrapTradeManagement } from "../../src/bootstrap";
import { PlatformRuntime } from "../../src/platform";

describe("integration: metadata runtime apply", () => {
  it("creates sqlite tables after metadata bootstrap", () => {
    const runtime = new PlatformRuntime();
    bootstrapTradeManagement(runtime);

    const tables = runtime.getDatabaseTables();
    expect(tables).toContain("catalog_items");
    expect(tables).toContain("catalog_warehouses");
    expect(tables).toContain("document_salesinvoice");
    expect(tables).toContain("register_stockbalance_movements");
  });
});

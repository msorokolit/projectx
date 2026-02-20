import { describe, expect, it } from "vitest";
import { bootstrapTradeManagement } from "../../src/bootstrap";
import { PlatformRuntime } from "../../src/platform";

describe("integration: register query performance baseline", () => {
  it("returns balance quickly after many movements", () => {
    const runtime = new PlatformRuntime();
    bootstrapTradeManagement(runtime);

    const item = runtime.upsertCatalogRecord("manager", "Manager", "Items", {
      name: "Perf item",
      sku: "PERF-ITEM",
      taxRate: 0.2
    });
    const warehouse = runtime.upsertCatalogRecord("manager", "Manager", "Warehouses", {
      name: "Perf warehouse"
    });

    for (let i = 0; i < 300; i += 1) {
      const receipt = runtime.upsertDocument("manager", "Manager", "WarehouseReceipt", {
        warehouseId: warehouse.id,
        lines: [{ itemId: item.id, quantity: 1, price: 10 }]
      });
      runtime.postDocument("manager", "Manager", "WarehouseReceipt", receipt.id);
    }

    const startedAt = Date.now();
    const balance = runtime.getRegisterBalance("StockBalance", {
      itemId: item.id,
      warehouseId: warehouse.id
    });
    const elapsedMs = Date.now() - startedAt;

    expect(balance.quantity).toBe(300);
    expect(elapsedMs).toBeLessThan(1500);
  });
});

import { describe, expect, it } from "vitest";
import { bootstrapTradeManagement } from "../../src/bootstrap";
import { PlatformRuntime } from "../../src/platform";

describe("integration: posting concurrency guard", () => {
  it("allows only one successful post per document", async () => {
    const runtime = new PlatformRuntime();
    bootstrapTradeManagement(runtime);

    const item = runtime.upsertCatalogRecord("manager", "Manager", "Items", {
      name: "Concurrent item",
      sku: "CON-01",
      taxRate: 0.2
    });
    const warehouse = runtime.upsertCatalogRecord("manager", "Manager", "Warehouses", {
      name: "Concurrent warehouse"
    });

    const receipt = runtime.upsertDocument("manager", "Manager", "WarehouseReceipt", {
      warehouseId: warehouse.id,
      lines: [{ itemId: item.id, quantity: 5, price: 100 }]
    });

    const postAttempts = await Promise.allSettled([
      Promise.resolve().then(() =>
        runtime.postDocument("manager", "Manager", "WarehouseReceipt", receipt.id)
      ),
      Promise.resolve().then(() =>
        runtime.postDocument("manager", "Manager", "WarehouseReceipt", receipt.id)
      )
    ]);

    const fulfilled = postAttempts.filter((result) => result.status === "fulfilled");
    const rejected = postAttempts.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const balance = runtime.getRegisterBalance("StockBalance", {
      itemId: item.id,
      warehouseId: warehouse.id
    });
    expect(balance.quantity).toBe(5);
  });
});

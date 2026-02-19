import { describe, expect, it } from "vitest";
import { bootstrapTradeManagement } from "../src/bootstrap";
import { PlatformRuntime } from "../src/platform";
import { ScriptEngine } from "../src/scriptingEngine";

describe("1C clone platform runtime", () => {
  it("posts and unposts documents with register movements", () => {
    const runtime = new PlatformRuntime();
    bootstrapTradeManagement(runtime);

    const item = runtime.upsertCatalogRecord("manager", "Manager", "Items", {
      name: "Laptop",
      sku: "LP-001",
      taxRate: 0.2
    });

    const warehouse = runtime.upsertCatalogRecord("manager", "Manager", "Warehouses", {
      name: "Main warehouse"
    });

    const receipt = runtime.upsertDocument("manager", "Manager", "WarehouseReceipt", {
      warehouseId: warehouse.id,
      lines: [{ itemId: item.id, quantity: 10, price: 1000 }]
    });
    runtime.postDocument("manager", "Manager", "WarehouseReceipt", receipt.id);

    const afterReceiptBalance = runtime.getRegisterBalance("StockBalance", {
      itemId: item.id,
      warehouseId: warehouse.id
    });
    expect(afterReceiptBalance.quantity).toBe(10);
    expect(afterReceiptBalance.amount).toBe(10000);

    const invoice = runtime.upsertDocument("manager", "Manager", "SalesInvoice", {
      warehouseId: warehouse.id,
      lines: [{ itemId: item.id, quantity: 4, price: 1500, taxRate: 0.2 }]
    });
    runtime.postDocument("manager", "Manager", "SalesInvoice", invoice.id);

    const afterInvoiceBalance = runtime.getRegisterBalance("StockBalance", {
      itemId: item.id,
      warehouseId: warehouse.id
    });
    expect(afterInvoiceBalance.quantity).toBe(6);
    expect(afterInvoiceBalance.amount).toBe(4000);

    runtime.unpostDocument("manager", "Manager", "SalesInvoice", invoice.id);
    const afterUnpostBalance = runtime.getRegisterBalance("StockBalance", {
      itemId: item.id,
      warehouseId: warehouse.id
    });
    expect(afterUnpostBalance.quantity).toBe(10);
    expect(afterUnpostBalance.amount).toBe(10000);
  });

  it("rejects posting invoice when stock is insufficient", () => {
    const runtime = new PlatformRuntime();
    bootstrapTradeManagement(runtime);

    const item = runtime.upsertCatalogRecord("manager", "Manager", "Items", {
      name: "Phone",
      sku: "PH-001",
      taxRate: 0.2
    });
    const warehouse = runtime.upsertCatalogRecord("manager", "Manager", "Warehouses", {
      name: "Secondary warehouse"
    });

    const invoice = runtime.upsertDocument("manager", "Manager", "SalesInvoice", {
      warehouseId: warehouse.id,
      lines: [{ itemId: item.id, quantity: 1, price: 500, taxRate: 0.2 }]
    });

    expect(() =>
      runtime.postDocument("manager", "Manager", "SalesInvoice", invoice.id)
    ).toThrow(/Not enough stock/);
  });

  it("enforces role permissions", () => {
    const runtime = new PlatformRuntime();
    bootstrapTradeManagement(runtime);

    expect(() =>
      runtime.upsertCatalogRecord("viewer", "Viewer", "Items", {
        name: "Blocked item",
        sku: "NOPE"
      })
    ).toThrow(/Access denied/);
  });
});

describe("script engine sandbox behavior", () => {
  it("does not expose process object", () => {
    const engine = new ScriptEngine();
    const result = engine.run({
      sourceCode: "() => typeof process",
      context: {}
    });
    expect(result).toBe("undefined");
  });

  it("stops infinite loops with timeout", () => {
    const engine = new ScriptEngine();
    expect(() =>
      engine.run({
        sourceCode: "() => { while (true) { /* burn */ } }",
        context: {},
        timeoutMs: 10
      })
    ).toThrow();
  });
});

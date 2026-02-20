import { describe, expect, it } from "vitest";
import { bootstrapTradeManagement } from "../src/bootstrap";
import { loadMetadataFromFile } from "../src/metadata";
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

  it("rolls back posting when onPost hook fails", () => {
    const runtime = new PlatformRuntime();
    const metadata = loadMetadataFromFile("examples/trade-management/metadata/trade-management.json");
    const receipt = metadata.documents.find((document) => document.name === "WarehouseReceipt");
    if (!receipt) {
      throw new Error("WarehouseReceipt metadata is missing");
    }
    receipt.hooks.onPost = "warehouseReceipt.onPost.fail";
    runtime.setMetadata(metadata, "test");
    runtime.registerScriptFromFile(
      "warehouseReceipt.beforePost",
      "examples/trade-management/scripts/warehouseReceipt.beforePost.js"
    );
    runtime.registerScript("warehouseReceipt.onPost.fail", "({ reject }) => reject('forced onPost failure')");

    const item = runtime.upsertCatalogRecord("manager", "Manager", "Items", {
      name: "Rollback item",
      sku: "ROLL-POST"
    });
    const warehouse = runtime.upsertCatalogRecord("manager", "Manager", "Warehouses", {
      name: "Rollback warehouse"
    });
    const receiptDoc = runtime.upsertDocument("manager", "Manager", "WarehouseReceipt", {
      warehouseId: warehouse.id,
      lines: [{ itemId: item.id, quantity: 3, price: 10 }]
    });

    expect(() =>
      runtime.postDocument("manager", "Manager", "WarehouseReceipt", receiptDoc.id)
    ).toThrow(/forced onPost failure/);

    const reloaded = runtime.getDocument("WarehouseReceipt", receiptDoc.id);
    expect(reloaded.posted).toBe(false);
    const balance = runtime.getRegisterBalance("StockBalance", {
      itemId: item.id,
      warehouseId: warehouse.id
    });
    expect(balance.quantity).toBe(0);
  });

  it("rolls back unpost when onUnpost hook fails", () => {
    const runtime = new PlatformRuntime();
    const metadata = loadMetadataFromFile("examples/trade-management/metadata/trade-management.json");
    const salesInvoice = metadata.documents.find((document) => document.name === "SalesInvoice");
    if (!salesInvoice) {
      throw new Error("SalesInvoice metadata is missing");
    }
    salesInvoice.hooks.onUnpost = "salesInvoice.onUnpost.fail";
    runtime.setMetadata(metadata, "test");
    runtime.registerScriptFromFile(
      "warehouseReceipt.beforePost",
      "examples/trade-management/scripts/warehouseReceipt.beforePost.js"
    );
    runtime.registerScriptFromFile(
      "salesInvoice.beforePost",
      "examples/trade-management/scripts/salesInvoice.beforePost.js"
    );
    runtime.registerScript("salesInvoice.onUnpost.fail", "({ reject }) => reject('forced onUnpost failure')");

    const item = runtime.upsertCatalogRecord("manager", "Manager", "Items", {
      name: "Rollback unpost item",
      sku: "ROLL-UNPOST"
    });
    const warehouse = runtime.upsertCatalogRecord("manager", "Manager", "Warehouses", {
      name: "Rollback unpost warehouse"
    });

    const receiptDoc = runtime.upsertDocument("manager", "Manager", "WarehouseReceipt", {
      warehouseId: warehouse.id,
      lines: [{ itemId: item.id, quantity: 10, price: 10 }]
    });
    runtime.postDocument("manager", "Manager", "WarehouseReceipt", receiptDoc.id);

    const invoice = runtime.upsertDocument("manager", "Manager", "SalesInvoice", {
      warehouseId: warehouse.id,
      lines: [{ itemId: item.id, quantity: 4, price: 20, taxRate: 0.2 }]
    });
    runtime.postDocument("manager", "Manager", "SalesInvoice", invoice.id);

    expect(() =>
      runtime.unpostDocument("manager", "Manager", "SalesInvoice", invoice.id)
    ).toThrow(/forced onUnpost failure/);

    const reloaded = runtime.getDocument("SalesInvoice", invoice.id);
    expect(reloaded.posted).toBe(true);
    const balance = runtime.getRegisterBalance("StockBalance", {
      itemId: item.id,
      warehouseId: warehouse.id
    });
    expect(balance.quantity).toBe(6);
  });

  it("provides log/db/registers host APIs for hooks", () => {
    const runtime = new PlatformRuntime();
    const metadata = loadMetadataFromFile("examples/trade-management/metadata/trade-management.json");
    const receipt = metadata.documents.find((document) => document.name === "WarehouseReceipt");
    if (!receipt) {
      throw new Error("WarehouseReceipt metadata is missing");
    }
    receipt.hooks.beforePost = "warehouseReceipt.beforePost.withHostApis";
    runtime.setMetadata(metadata, "test");
    runtime.registerScript(
      "warehouseReceipt.beforePost.withHostApis",
      "({ document, db, registers, log, addMovement }) => {" +
        "const items = db.listCatalogRecords('Items');" +
        "const preview = registers.getBalance('StockBalance', { itemId: 'x', warehouseId: 'y' });" +
        "log('hook-start', { itemCount: items.length, preview });" +
        "for (const line of document.lines) {" +
          "addMovement({ register: 'StockBalance', kind: 'in', dimensions: { itemId: line.itemId, warehouseId: document.warehouseId }, resources: { quantity: Number(line.quantity), amount: Number(line.quantity) * Number(line.price) } });" +
        "}" +
      "}"
    );

    const item = runtime.upsertCatalogRecord("manager", "Manager", "Items", {
      name: "Host API item",
      sku: "HOST-API"
    });
    const warehouse = runtime.upsertCatalogRecord("manager", "Manager", "Warehouses", {
      name: "Host API warehouse"
    });
    const receiptDoc = runtime.upsertDocument("manager", "Manager", "WarehouseReceipt", {
      warehouseId: warehouse.id,
      lines: [{ itemId: item.id, quantity: 2, price: 30 }]
    });
    runtime.postDocument("manager", "Manager", "WarehouseReceipt", receiptDoc.id);

    const audit = runtime.getAuditLog();
    expect(
      audit.some(
        (entry) => entry.action === "script.log" && entry.details?.message === "hook-start"
      )
    ).toBe(true);
  });
});

describe("script engine sandbox behavior", () => {
  it("rejects forbidden node globals in source", () => {
    const engine = new ScriptEngine();
    expect(() =>
      engine.run({
        sourceCode: "() => typeof process",
        context: {}
      })
    ).toThrow(/forbidden token/);
  });

  it("rejects require usage in source", () => {
    const engine = new ScriptEngine();
    expect(() =>
      engine.run({
        sourceCode: "() => require('node:fs')",
        context: {}
      })
    ).toThrow(/forbidden token/);
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

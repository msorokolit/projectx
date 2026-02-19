import { type ModuleDeps, type RequestContext } from "../module-types";

export class DemoService {
  constructor(private readonly deps: ModuleDeps) {}

  seedTradeScenario(context: RequestContext): Record<string, unknown> {
    if (context.role !== "Admin") {
      throw new Error("Only Admin can run demo seed.");
    }

    const suffix = Date.now();
    const item = this.deps.runtime.upsertCatalogRecord(context.actor, context.role, "Items", {
      name: `Demo item ${suffix}`,
      sku: `DEMO-${suffix}`,
      taxRate: 0.2
    });
    const warehouse = this.deps.runtime.upsertCatalogRecord(
      context.actor,
      context.role,
      "Warehouses",
      {
        name: `Demo warehouse ${suffix}`
      }
    );

    const receipt = this.deps.runtime.upsertDocument(
      context.actor,
      context.role,
      "WarehouseReceipt",
      {
        warehouseId: warehouse.id,
        lines: [{ itemId: item.id, quantity: 10, price: 100 }]
      }
    );
    const postedReceipt = this.deps.runtime.postDocument(
      context.actor,
      context.role,
      "WarehouseReceipt",
      receipt.id
    );

    const balanceAfterReceipt = this.deps.runtime.getRegisterBalance("StockBalance", {
      itemId: item.id,
      warehouseId: warehouse.id
    });

    const invoice = this.deps.runtime.upsertDocument(context.actor, context.role, "SalesInvoice", {
      warehouseId: warehouse.id,
      lines: [{ itemId: item.id, quantity: 4, price: 150, taxRate: 0.2 }]
    });
    const postedInvoice = this.deps.runtime.postDocument(
      context.actor,
      context.role,
      "SalesInvoice",
      invoice.id
    );

    const balanceAfterInvoice = this.deps.runtime.getRegisterBalance("StockBalance", {
      itemId: item.id,
      warehouseId: warehouse.id
    });

    const unpostedInvoice = this.deps.runtime.unpostDocument(
      context.actor,
      context.role,
      "SalesInvoice",
      invoice.id
    );

    const balanceAfterUnpost = this.deps.runtime.getRegisterBalance("StockBalance", {
      itemId: item.id,
      warehouseId: warehouse.id
    });

    return {
      item,
      warehouse,
      postedReceipt,
      postedInvoice,
      unpostedInvoice,
      balanceAfterReceipt,
      balanceAfterInvoice,
      balanceAfterUnpost
    };
  }
}

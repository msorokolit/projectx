import { describe, expect, it } from "vitest";
import { summarizePostedResources } from "../packages/core/src/domain/posting";

describe("core posting helpers", () => {
  it("summarizes resource totals from movements", () => {
    const total = summarizePostedResources(
      [
        {
          id: "1",
          register: "StockBalance",
          kind: "in",
          dimensions: { itemId: "a" },
          resources: { quantity: 10, amount: 100 },
          documentType: "WarehouseReceipt",
          documentId: "d1",
          timestamp: new Date().toISOString()
        },
        {
          id: "2",
          register: "StockBalance",
          kind: "out",
          dimensions: { itemId: "a" },
          resources: { quantity: -4, amount: -40 },
          documentType: "SalesInvoice",
          documentId: "d2",
          timestamp: new Date().toISOString()
        }
      ],
      "quantity"
    );
    expect(total).toBe(6);
  });
});

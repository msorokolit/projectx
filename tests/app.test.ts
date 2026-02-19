import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app";
import { bootstrapTradeManagement } from "../src/bootstrap";
import { PlatformRuntime } from "../src/platform";

describe("HTTP API", () => {
  const runtime = new PlatformRuntime();
  bootstrapTradeManagement(runtime);
  const app = createApp(runtime);

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("returns metadata", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/metadata"
    });
    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.name).toBe("TradeManagement");
  });

  it("allows manager to create catalogs and documents", async () => {
    const itemResponse = await app.inject({
      method: "POST",
      url: "/api/catalog/Items",
      headers: {
        "x-role": "Manager",
        "x-user": "alice"
      },
      payload: {
        name: "Monitor",
        sku: "MN-001",
        taxRate: 0.15
      }
    });
    expect(itemResponse.statusCode).toBe(200);
    const item = itemResponse.json();

    const warehouseResponse = await app.inject({
      method: "POST",
      url: "/api/catalog/Warehouses",
      headers: {
        "x-role": "Manager",
        "x-user": "alice"
      },
      payload: {
        name: "WH-API"
      }
    });
    expect(warehouseResponse.statusCode).toBe(200);
    const warehouse = warehouseResponse.json();

    const receiptResponse = await app.inject({
      method: "POST",
      url: "/api/document/WarehouseReceipt",
      headers: {
        "x-role": "Manager",
        "x-user": "alice"
      },
      payload: {
        warehouseId: warehouse.id,
        lines: [{ itemId: item.id, quantity: 5, price: 100 }]
      }
    });
    expect(receiptResponse.statusCode).toBe(200);
    const receipt = receiptResponse.json();

    const postResponse = await app.inject({
      method: "POST",
      url: `/api/document/WarehouseReceipt/${receipt.id}/post`,
      headers: {
        "x-role": "Manager",
        "x-user": "alice"
      }
    });
    expect(postResponse.statusCode).toBe(200);

    const balanceResponse = await app.inject({
      method: "GET",
      url: `/api/register/StockBalance/balance?itemId=${item.id}&warehouseId=${warehouse.id}`,
      headers: {
        "x-role": "Manager",
        "x-user": "alice"
      }
    });
    expect(balanceResponse.statusCode).toBe(200);
    expect(balanceResponse.json().quantity).toBe(5);
  });

  it("blocks viewer from write operations", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/api/catalog/Items",
      headers: {
        "x-role": "Viewer",
        "x-user": "bob"
      },
      payload: {
        name: "Blocked",
        sku: "NO-ACCESS"
      }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toMatch(/Access denied/);
  });
});

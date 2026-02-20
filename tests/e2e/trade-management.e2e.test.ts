import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../../src/app";
import { bootstrapTradeManagement } from "../../src/bootstrap";
import { PlatformRuntime } from "../../src/platform";

describe("e2e: trade management scenario", () => {
  const runtime = new PlatformRuntime();
  bootstrapTradeManagement(runtime);
  const app = createApp(runtime);

  beforeAll(async () => {
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("executes receipt -> invoice -> unpost flow", async () => {
    const loginResponse = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: {
        username: "manager",
        password: "manager"
      }
    });
    expect(loginResponse.statusCode).toBe(200);
    const token = loginResponse.json().accessToken as string;

    const itemResponse = await app.inject({
      method: "POST",
      url: "/api/catalog/Items",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "E2E item",
        sku: "E2E-ITEM",
        taxRate: 0.2
      }
    });
    const item = itemResponse.json();

    const warehouseResponse = await app.inject({
      method: "POST",
      url: "/api/catalog/Warehouses",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        name: "E2E warehouse"
      }
    });
    const warehouse = warehouseResponse.json();

    const receiptResponse = await app.inject({
      method: "POST",
      url: "/api/document/WarehouseReceipt",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        warehouseId: warehouse.id,
        lines: [{ itemId: item.id, quantity: 10, price: 120 }]
      }
    });
    const receipt = receiptResponse.json();

    await app.inject({
      method: "POST",
      url: `/api/document/WarehouseReceipt/${receipt.id}/post`,
      headers: { authorization: `Bearer ${token}` }
    });

    const invoiceResponse = await app.inject({
      method: "POST",
      url: "/api/document/SalesInvoice",
      headers: { authorization: `Bearer ${token}` },
      payload: {
        warehouseId: warehouse.id,
        lines: [{ itemId: item.id, quantity: 4, price: 200, taxRate: 0.2 }]
      }
    });
    const invoice = invoiceResponse.json();

    await app.inject({
      method: "POST",
      url: `/api/document/SalesInvoice/${invoice.id}/post`,
      headers: { authorization: `Bearer ${token}` }
    });

    const balanceAfterPostResponse = await app.inject({
      method: "GET",
      url: `/api/register/StockBalance/balance?itemId=${item.id}&warehouseId=${warehouse.id}`,
      headers: { authorization: `Bearer ${token}` }
    });
    expect(balanceAfterPostResponse.json().quantity).toBe(6);

    await app.inject({
      method: "POST",
      url: `/api/document/SalesInvoice/${invoice.id}/unpost`,
      headers: { authorization: `Bearer ${token}` }
    });

    const balanceAfterUnpostResponse = await app.inject({
      method: "GET",
      url: `/api/register/StockBalance/balance?itemId=${item.id}&warehouseId=${warehouse.id}`,
      headers: { authorization: `Bearer ${token}` }
    });
    expect(balanceAfterUnpostResponse.json().quantity).toBe(10);
  });
});

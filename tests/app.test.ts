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

  async function login(username: string, password: string): Promise<string> {
    const response = await app.inject({
      method: "POST",
      url: "/api/auth/login",
      payload: { username, password }
    });
    expect(response.statusCode).toBe(200);
    return response.json().accessToken as string;
  }

  it("returns metadata", async () => {
    const token = await login("manager", "manager");
    const response = await app.inject({
      method: "GET",
      url: "/api/metadata",
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    expect(response.statusCode).toBe(200);
    const payload = response.json();
    expect(payload.name).toBe("TradeManagement");
  });

  it("returns metadata SQL preview and migration history", async () => {
    const managerToken = await login("manager", "manager");
    const adminToken = await login("admin", "admin");
    const previewResponse = await app.inject({
      method: "GET",
      url: "/api/metadata/sql-preview",
      headers: {
        authorization: `Bearer ${managerToken}`
      }
    });
    expect(previewResponse.statusCode).toBe(200);
    const previewPayload = previewResponse.json();
    expect(Array.isArray(previewPayload.statements)).toBe(true);
    expect(previewPayload.statements.length).toBeGreaterThan(1);

    const migrationsResponse = await app.inject({
      method: "GET",
      url: "/api/metadata/migrations",
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    });
    expect(migrationsResponse.statusCode).toBe(200);
    const migrationsPayload = migrationsResponse.json();
    expect(Array.isArray(migrationsPayload)).toBe(true);
    expect(migrationsPayload.length).toBeGreaterThan(0);
    expect(migrationsPayload[0].metadataName).toBe("TradeManagement");

    const tablesResponse = await app.inject({
      method: "GET",
      url: "/api/metadata/db-tables",
      headers: {
        authorization: `Bearer ${adminToken}`
      }
    });
    expect(tablesResponse.statusCode).toBe(200);
    const tablesPayload = tablesResponse.json();
    expect(tablesPayload.tables).toContain("catalog_items");
    expect(tablesPayload.tables).toContain("document_salesinvoice");
  });

  it("blocks non-admin migration history access", async () => {
    const managerToken = await login("manager", "manager");
    const response = await app.inject({
      method: "GET",
      url: "/api/metadata/migrations",
      headers: {
        authorization: `Bearer ${managerToken}`
      }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toMatch(/Only Admin/);
  });

  it("allows manager to create catalogs and documents", async () => {
    const token = await login("manager", "manager");
    const itemResponse = await app.inject({
      method: "POST",
      url: "/api/catalog/Items",
      headers: {
        authorization: `Bearer ${token}`
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
        authorization: `Bearer ${token}`
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
        authorization: `Bearer ${token}`
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
        authorization: `Bearer ${token}`
      }
    });
    expect(postResponse.statusCode).toBe(200);

    const balanceResponse = await app.inject({
      method: "GET",
      url: `/api/register/StockBalance/balance?itemId=${item.id}&warehouseId=${warehouse.id}`,
      headers: {
        authorization: `Bearer ${token}`
      }
    });
    expect(balanceResponse.statusCode).toBe(200);
    expect(balanceResponse.json().quantity).toBe(5);
  });

  it("blocks viewer from write operations", async () => {
    const token = await login("viewer", "viewer");
    const response = await app.inject({
      method: "POST",
      url: "/api/catalog/Items",
      headers: {
        authorization: `Bearer ${token}`
      },
      payload: {
        name: "Blocked",
        sku: "NO-ACCESS"
      }
    });
    expect(response.statusCode).toBe(400);
    expect(response.json().message).toMatch(/Access denied/);
  });

  it("rejects requests without JWT token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/api/metadata"
    });
    expect(response.statusCode).toBe(401);
  });

  it("serves web client homepage", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/"
    });
    expect(response.statusCode).toBe(200);
    expect(response.body).toContain("1C Enterprise Clone");
  });
});

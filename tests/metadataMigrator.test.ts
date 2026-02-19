import { describe, expect, it } from "vitest";
import { compileMetadataToSql, createMigrationRecord } from "../src/metadataCompiler";
import { loadMetadataFromFile } from "../src/metadata";
import { MetadataMigrator } from "../src/metadataMigrator";

describe("metadata migrator", () => {
  it("applies generated SQL statements into sqlite schema", () => {
    const metadata = loadMetadataFromFile("examples/trade-management/metadata/trade-management.json");
    const statements = compileMetadataToSql(metadata);
    const migration = createMigrationRecord("tester", metadata, statements);
    const migrator = new MetadataMigrator();

    migrator.applyMigration(migration);
    const tables = migrator.listTables();
    expect(tables).toContain("catalog_items");
    expect(tables).toContain("document_warehousereceipt");
    expect(tables).toContain("register_stockbalance_movements");
    migrator.close();
  });
});

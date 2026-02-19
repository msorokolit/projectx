import { describe, expect, it } from "vitest";
import { compileMetadataToSql } from "../src/metadataCompiler";
import { loadMetadataFromFile } from "../src/metadata";

describe("metadata compiler", () => {
  it("generates create statements for all object kinds", () => {
    const metadata = loadMetadataFromFile("examples/trade-management/metadata/trade-management.json");
    const statements = compileMetadataToSql(metadata);

    expect(statements.some((statement) => statement.includes("catalog_items"))).toBe(true);
    expect(statements.some((statement) => statement.includes("document_salesinvoice"))).toBe(true);
    expect(statements.some((statement) => statement.includes("register_stockbalance_movements"))).toBe(true);
    expect(statements.at(-1)).toContain("metadata_registry");
  });
});

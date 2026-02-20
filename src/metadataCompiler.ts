import { randomUUID } from "node:crypto";
import { type AppMetadata, type MetadataMigrationRecord } from "./types";

function normalizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase();
}

function baseColumns(): string {
  return [
    "id TEXT PRIMARY KEY",
    "created_at TEXT NOT NULL",
    "updated_at TEXT NOT NULL",
    "active INTEGER NOT NULL",
    "data TEXT NOT NULL"
  ].join(", ");
}

export function compileMetadataToSql(metadata: AppMetadata): string[] {
  const statements: string[] = [];

  statements.push(
    "CREATE TABLE IF NOT EXISTS metadata_registry (name TEXT PRIMARY KEY, version TEXT NOT NULL, applied_at TEXT NOT NULL);"
  );

  for (const catalog of metadata.catalogs) {
    const tableName = `catalog_${normalizeName(catalog.name)}`;
    statements.push(`CREATE TABLE IF NOT EXISTS ${tableName} (${baseColumns()});`);
  }

  for (const document of metadata.documents) {
    const tableName = `document_${normalizeName(document.name)}`;
    statements.push(
      `CREATE TABLE IF NOT EXISTS ${tableName} (${baseColumns()}, posted INTEGER NOT NULL);`
    );
  }

  for (const register of metadata.registers) {
    const tableName = `register_${normalizeName(register.name)}_movements`;
    statements.push(
      "CREATE TABLE IF NOT EXISTS " +
        `${tableName} (` +
        [
          "id TEXT PRIMARY KEY",
          "kind TEXT NOT NULL",
          "dimensions TEXT NOT NULL",
          "resources TEXT NOT NULL",
          "document_type TEXT NOT NULL",
          "document_id TEXT NOT NULL",
          "timestamp TEXT NOT NULL"
        ].join(", ") +
        ");"
    );
  }

  statements.push(
    `INSERT OR REPLACE INTO metadata_registry (name, version, applied_at) VALUES ('${metadata.name}', '${metadata.version}', CURRENT_TIMESTAMP);`
  );

  return statements;
}

export function createMigrationRecord(
  actor: string,
  metadata: AppMetadata,
  statements: string[]
): MetadataMigrationRecord {
  return {
    id: randomUUID(),
    actor,
    timestamp: new Date().toISOString(),
    metadataName: metadata.name,
    metadataVersion: metadata.version,
    statements
  };
}

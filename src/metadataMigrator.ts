import { DatabaseSync } from "node:sqlite";
import { type MetadataMigrationRecord } from "./types";

export class MetadataMigrator {
  private readonly db: DatabaseSync;

  constructor(databasePath = ":memory:") {
    this.db = new DatabaseSync(databasePath);
  }

  applyMigration(migration: MetadataMigrationRecord): void {
    for (const statement of migration.statements) {
      this.db.exec(statement);
    }
  }

  listTables(): string[] {
    const rows = this.db
      .prepare(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
      )
      .all() as Array<{ name: string }>;
    return rows.map((row) => row.name);
  }

  close(): void {
    this.db.close();
  }
}

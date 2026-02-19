import { parseMetadata } from "../../../../../src/metadata";
import { type ModuleDeps, type RequestContext } from "../module-types";

export class MetadataService {
  constructor(private readonly deps: ModuleDeps) {}

  load(payload: unknown, context: RequestContext): { ok: true; name: string; version: string } {
    const metadata = parseMetadata(payload);
    this.deps.runtime.setMetadata(metadata, context.actor);
    return { ok: true, name: metadata.name, version: metadata.version };
  }

  get(): unknown {
    return this.deps.runtime.getMetadata();
  }

  getSqlPreview(): { statements: string[] } {
    return { statements: this.deps.runtime.getMetadataSqlPreview() };
  }

  getMigrations(context: RequestContext): unknown {
    if (context.role !== "Admin") {
      throw new Error("Only Admin can read metadata migration history.");
    }
    return this.deps.runtime.getMetadataMigrationHistory();
  }

  getDbTables(context: RequestContext): { tables: string[] } {
    if (context.role !== "Admin") {
      throw new Error("Only Admin can read database table list.");
    }
    return { tables: this.deps.runtime.getDatabaseTables() };
  }
}

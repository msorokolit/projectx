import { type ModuleDeps, type RequestContext } from "../module-types";

export class CatalogsService {
  constructor(private readonly deps: ModuleDeps) {}

  list(catalog: string, context: RequestContext): unknown {
    this.deps.runtime.assertPermission(context.role, "catalog", catalog, "read");
    return this.deps.runtime.listCatalogRecords(catalog);
  }

  get(catalog: string, id: string, context: RequestContext): unknown {
    this.deps.runtime.assertPermission(context.role, "catalog", catalog, "read");
    return this.deps.runtime.getCatalogRecord(catalog, id);
  }

  create(catalog: string, body: Record<string, unknown>, context: RequestContext): unknown {
    return this.deps.runtime.upsertCatalogRecord(context.actor, context.role, catalog, body);
  }

  update(
    catalog: string,
    id: string,
    body: Record<string, unknown>,
    context: RequestContext
  ): unknown {
    return this.deps.runtime.upsertCatalogRecord(context.actor, context.role, catalog, body, id);
  }
}

import { type ModuleDeps, type RequestContext } from "../module-types";

export class DocumentsService {
  constructor(private readonly deps: ModuleDeps) {}

  list(document: string, context: RequestContext): unknown {
    this.deps.runtime.assertPermission(context.role, "document", document, "read");
    return this.deps.runtime.listDocuments(document);
  }

  get(document: string, id: string, context: RequestContext): unknown {
    this.deps.runtime.assertPermission(context.role, "document", document, "read");
    return this.deps.runtime.getDocument(document, id);
  }

  create(document: string, body: Record<string, unknown>, context: RequestContext): unknown {
    return this.deps.runtime.upsertDocument(context.actor, context.role, document, body);
  }

  update(
    document: string,
    id: string,
    body: Record<string, unknown>,
    context: RequestContext
  ): unknown {
    return this.deps.runtime.upsertDocument(context.actor, context.role, document, body, id);
  }

  post(document: string, id: string, context: RequestContext): unknown {
    return this.deps.runtime.postDocument(context.actor, context.role, document, id);
  }

  unpost(document: string, id: string, context: RequestContext): unknown {
    return this.deps.runtime.unpostDocument(context.actor, context.role, document, id);
  }
}

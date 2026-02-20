import { type ModuleDeps, type RequestContext } from "../module-types";
import { PostingOrchestrator } from "./posting-orchestrator";

export class DocumentsService {
  private readonly postingOrchestrator: PostingOrchestrator;

  constructor(private readonly deps: ModuleDeps) {
    this.postingOrchestrator = new PostingOrchestrator(deps);
  }

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
    return this.postingOrchestrator.post(document, id, context);
  }

  unpost(document: string, id: string, context: RequestContext): unknown {
    return this.postingOrchestrator.unpost(document, id, context);
  }
}

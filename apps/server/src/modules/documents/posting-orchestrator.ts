import { type ModuleDeps, type RequestContext } from "../module-types";

export class PostingOrchestrator {
  constructor(private readonly deps: ModuleDeps) {}

  post(document: string, id: string, context: RequestContext): unknown {
    return this.deps.runtime.postDocument(context.actor, context.role, document, id);
  }

  unpost(document: string, id: string, context: RequestContext): unknown {
    return this.deps.runtime.unpostDocument(context.actor, context.role, document, id);
  }
}

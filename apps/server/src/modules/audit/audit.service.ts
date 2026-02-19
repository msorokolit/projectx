import { type ModuleDeps, type RequestContext } from "../module-types";

export class AuditService {
  constructor(private readonly deps: ModuleDeps) {}

  list(context: RequestContext): unknown {
    if (context.role !== "Admin") {
      throw new Error("Only Admin can read audit log.");
    }
    return this.deps.runtime.getAuditLog();
  }
}

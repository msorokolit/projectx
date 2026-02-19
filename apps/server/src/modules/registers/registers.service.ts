import { type ModuleDeps, type RequestContext } from "../module-types";

export class RegistersService {
  constructor(private readonly deps: ModuleDeps) {}

  movements(register: string, context: RequestContext): unknown {
    this.deps.runtime.assertPermission(context.role, "register", register, "read");
    return this.deps.runtime.getRegisterMovements(register);
  }

  balance(
    register: string,
    filter: Record<string, unknown>,
    context: RequestContext
  ): Record<string, number> {
    this.deps.runtime.assertPermission(context.role, "register", register, "read");
    return this.deps.runtime.getRegisterBalance(register, filter);
  }
}

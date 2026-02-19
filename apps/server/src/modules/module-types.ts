import { type FastifyRequest } from "fastify";
import { type PlatformRuntime } from "../../../../src/platform";

export interface RequestContext {
  actor: string;
  role: string;
}

export type RequireRequestContext = (request: FastifyRequest) => Promise<RequestContext>;

export interface ModuleDeps {
  runtime: PlatformRuntime;
  requireRequestContext: RequireRequestContext;
}

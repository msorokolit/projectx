export interface ScriptSandboxContext {
  document?: Record<string, unknown>;
  context?: {
    actor: string;
    objectName: string;
  };
  [key: string]: unknown;
}

import { z } from "zod";

export const fieldTypeSchema = z.enum([
  "string",
  "number",
  "boolean",
  "date",
  "array",
  "object"
]);

export const fieldSchema = z.object({
  name: z.string().min(1),
  type: fieldTypeSchema,
  required: z.boolean().default(false)
});

export const registerMovementSchema = z.object({
  register: z.string().min(1),
  kind: z.enum(["in", "out"]),
  dimensions: z.record(z.string(), z.any()),
  resources: z.record(z.string(), z.number())
});

export const scriptingHooksSchema = z.object({
  beforeWrite: z.string().optional(),
  onWrite: z.string().optional(),
  beforePost: z.string().optional(),
  onPost: z.string().optional(),
  onUnpost: z.string().optional()
});

export const objectPermissionSchema = z.object({
  objectType: z.enum(["catalog", "document", "register", "metadata"]),
  object: z.string().min(1),
  actions: z.array(z.enum(["read", "write", "post", "admin"])).min(1)
});

export const roleSchema = z.object({
  name: z.string().min(1),
  permissions: z.array(objectPermissionSchema).default([])
});

export const catalogSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  fields: z.array(fieldSchema).default([]),
  hooks: scriptingHooksSchema.partial().default({})
});

export const documentSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  fields: z.array(fieldSchema).default([]),
  hooks: scriptingHooksSchema.partial().default({})
});

export const registerSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  type: z.enum(["information", "accumulation"]),
  dimensions: z.array(z.string()).default([]),
  resources: z.array(z.string()).default([])
});

export const appMetadataSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  catalogs: z.array(catalogSchema).default([]),
  documents: z.array(documentSchema).default([]),
  registers: z.array(registerSchema).default([]),
  roles: z.array(roleSchema).default([])
});

export type FieldType = z.infer<typeof fieldTypeSchema>;
export type FieldDefinition = z.infer<typeof fieldSchema>;
export type RegisterMovement = z.infer<typeof registerMovementSchema>;
export type ScriptingHooks = z.infer<typeof scriptingHooksSchema>;
export type CatalogDefinition = z.infer<typeof catalogSchema>;
export type DocumentDefinition = z.infer<typeof documentSchema>;
export type RegisterDefinition = z.infer<typeof registerSchema>;
export type ObjectPermission = z.infer<typeof objectPermissionSchema>;
export type RoleDefinition = z.infer<typeof roleSchema>;
export type AppMetadata = z.infer<typeof appMetadataSchema>;

export type PlatformObjectType = "catalog" | "document" | "register" | "metadata";
export type PlatformAction = "read" | "write" | "post" | "admin";

export interface PlatformRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  data: Record<string, unknown>;
  active: boolean;
}

export interface DocumentRecord extends PlatformRecord {
  posted: boolean;
}

export interface RegisterMovementRecord {
  id: string;
  register: string;
  kind: "in" | "out";
  dimensions: Record<string, unknown>;
  resources: Record<string, number>;
  documentType: string;
  documentId: string;
  timestamp: string;
}

export interface MetadataMigrationRecord {
  id: string;
  timestamp: string;
  actor: string;
  metadataName: string;
  metadataVersion: string;
  statements: string[];
}

export interface ScriptExecutionMetric {
  id: string;
  timestamp: string;
  hookName: string;
  objectName: string;
  actor: string;
  durationMs: number;
  status: "ok" | "error";
  errorMessage?: string;
}

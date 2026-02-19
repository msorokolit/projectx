import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { compileMetadataToSql, createMigrationRecord } from "./metadataCompiler";
import { MetadataMigrator } from "./metadataMigrator";
import { ScriptEngine } from "./scriptingEngine";
import {
  type AppMetadata,
  type CatalogDefinition,
  type DocumentDefinition,
  type DocumentRecord,
  type MetadataMigrationRecord,
  type PlatformAction,
  type PlatformObjectType,
  type PlatformRecord,
  type RegisterMovement,
  type RegisterMovementRecord,
  type ScriptExecutionMetric
} from "./types";

export interface AuditEntry {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  objectType: PlatformObjectType;
  objectName: string;
  objectId?: string;
  details?: Record<string, unknown>;
}

interface HookContext {
  actor: string;
  objectName: string;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function nowIso(): string {
  return new Date().toISOString();
}

function matchesFilter(
  source: Record<string, unknown>,
  filter: Record<string, unknown>
): boolean {
  return Object.entries(filter).every(([key, expected]) => source[key] === expected);
}

export class PlatformRuntime {
  private metadata: AppMetadata | null = null;
  private readonly catalogs = new Map<string, Map<string, PlatformRecord>>();
  private readonly documents = new Map<string, Map<string, DocumentRecord>>();
  private readonly registerMovements = new Map<string, RegisterMovementRecord[]>();
  private readonly scriptRegistry = new Map<string, string>();
  private readonly auditLog: AuditEntry[] = [];
  private readonly scriptMetrics: ScriptExecutionMetric[] = [];
  private readonly metadataMigrations: MetadataMigrationRecord[] = [];
  private metadataSqlPreview: string[] = [];
  private readonly scriptEngine = new ScriptEngine();
  private readonly metadataMigrator = new MetadataMigrator();

  setMetadata(metadata: AppMetadata, actor = "system"): void {
    const statements = compileMetadataToSql(metadata);
    const migrationRecord = createMigrationRecord(actor, metadata, statements);

    this.metadata = metadata;
    this.metadataSqlPreview = statements;
    this.metadataMigrations.push(migrationRecord);
    this.metadataMigrator.applyMigration(migrationRecord);
    this.catalogs.clear();
    this.documents.clear();
    this.registerMovements.clear();
    this.scriptRegistry.clear();
    for (const catalog of metadata.catalogs) {
      this.catalogs.set(catalog.name, new Map());
    }
    for (const document of metadata.documents) {
      this.documents.set(document.name, new Map());
    }
    for (const register of metadata.registers) {
      this.registerMovements.set(register.name, []);
    }
    this.audit(actor, "metadata.apply", "metadata", metadata.name, undefined, {
      version: metadata.version
    });
  }

  getMetadata(): AppMetadata {
    if (!this.metadata) {
      throw new Error("Metadata is not loaded.");
    }
    return this.metadata;
  }

  getMetadataSqlPreview(): string[] {
    return clone(this.metadataSqlPreview);
  }

  getMetadataMigrationHistory(): MetadataMigrationRecord[] {
    return clone(this.metadataMigrations);
  }

  getDatabaseTables(): string[] {
    return this.metadataMigrator.listTables();
  }

  registerScript(scriptName: string, sourceCode: string): void {
    this.scriptRegistry.set(scriptName, sourceCode);
  }

  registerScriptFromFile(scriptName: string, filePath: string): void {
    const content = readFileSync(resolve(filePath), "utf-8");
    this.registerScript(scriptName, content);
  }

  listCatalogRecords(name: string): PlatformRecord[] {
    return Array.from(this.getCatalogStore(name).values()).map((record) => clone(record));
  }

  getCatalogRecord(name: string, id: string): PlatformRecord {
    const record = this.getCatalogStore(name).get(id);
    if (!record) {
      throw new Error(`Catalog record not found: ${name}/${id}`);
    }
    return clone(record);
  }

  upsertCatalogRecord(
    actor: string,
    role: string,
    catalogName: string,
    payload: Record<string, unknown>,
    id?: string
  ): PlatformRecord {
    this.assertPermission(role, "catalog", catalogName, "write");
    const definition = this.findCatalog(catalogName);
    this.validatePayload(definition.fields, payload);
    const store = this.getCatalogStore(catalogName);
    const recordId = id ?? randomUUID();
    const existing = id ? store.get(id) : undefined;
    const timestamp = nowIso();

    const record: PlatformRecord = {
      id: recordId,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      active: existing?.active ?? true,
      data: clone(payload)
    };

    this.runHook(definition.hooks.beforeWrite, {
      actor,
      objectName: catalogName
    }, {
      record
    });

    store.set(record.id, record);
    this.runHook(definition.hooks.onWrite, {
      actor,
      objectName: catalogName
    }, {
      record
    });
    this.audit(actor, existing ? "catalog.update" : "catalog.create", "catalog", catalogName, record.id);
    return clone(record);
  }

  listDocuments(name: string): DocumentRecord[] {
    return Array.from(this.getDocumentStore(name).values()).map((record) => clone(record));
  }

  getDocument(name: string, id: string): DocumentRecord {
    const record = this.getDocumentStore(name).get(id);
    if (!record) {
      throw new Error(`Document not found: ${name}/${id}`);
    }
    return clone(record);
  }

  upsertDocument(
    actor: string,
    role: string,
    documentName: string,
    payload: Record<string, unknown>,
    id?: string
  ): DocumentRecord {
    this.assertPermission(role, "document", documentName, "write");
    const definition = this.findDocument(documentName);
    this.validatePayload(definition.fields, payload);
    const store = this.getDocumentStore(documentName);
    const recordId = id ?? randomUUID();
    const existing = id ? store.get(id) : undefined;
    const timestamp = nowIso();
    const record: DocumentRecord = {
      id: recordId,
      createdAt: existing?.createdAt ?? timestamp,
      updatedAt: timestamp,
      active: existing?.active ?? true,
      posted: existing?.posted ?? false,
      data: clone(payload)
    };

    this.runHook(definition.hooks.beforeWrite, {
      actor,
      objectName: documentName
    }, {
      document: record
    });

    store.set(record.id, record);
    this.runHook(definition.hooks.onWrite, {
      actor,
      objectName: documentName
    }, {
      document: record
    });
    this.audit(actor, existing ? "document.update" : "document.create", "document", documentName, record.id);
    return clone(record);
  }

  postDocument(actor: string, role: string, documentName: string, id: string): DocumentRecord {
    this.assertPermission(role, "document", documentName, "post");
    const definition = this.findDocument(documentName);
    const store = this.getDocumentStore(documentName);
    const record = store.get(id);
    if (!record) {
      throw new Error(`Document not found: ${documentName}/${id}`);
    }
    if (record.posted) {
      throw new Error(`Document already posted: ${documentName}/${id}`);
    }

    const recordSnapshot = clone(record);
    const registerSnapshot = this.snapshotRegisterMovements();
    const pendingMovements: RegisterMovement[] = [];
    try {
      this.runHook(
        definition.hooks.beforePost,
        { actor, objectName: documentName },
        this.buildDocumentHookApi(record, pendingMovements)
      );

      for (const movement of pendingMovements) {
        this.pushMovement(record, documentName, movement);
      }

      record.posted = true;
      record.updatedAt = nowIso();
      store.set(id, record);

      this.runHook(
        definition.hooks.onPost,
        { actor, objectName: documentName },
        this.buildDocumentHookApi(record, pendingMovements)
      );

      this.audit(actor, "document.post", "document", documentName, id, {
        movementCount: pendingMovements.length
      });
      return clone(record);
    } catch (error) {
      store.set(id, recordSnapshot);
      this.restoreRegisterMovements(registerSnapshot);
      this.audit(actor, "document.post.failed", "document", documentName, id, {
        error: error instanceof Error ? error.message : "Unknown posting error"
      });
      throw error;
    }
  }

  unpostDocument(actor: string, role: string, documentName: string, id: string): DocumentRecord {
    this.assertPermission(role, "document", documentName, "post");
    const definition = this.findDocument(documentName);
    const store = this.getDocumentStore(documentName);
    const record = store.get(id);
    if (!record) {
      throw new Error(`Document not found: ${documentName}/${id}`);
    }
    if (!record.posted) {
      throw new Error(`Document is not posted: ${documentName}/${id}`);
    }
    const recordSnapshot = clone(record);
    const registerSnapshot = this.snapshotRegisterMovements();
    try {
      for (const [registerName, movements] of this.registerMovements.entries()) {
        const filtered = movements.filter(
          (movement) =>
            !(movement.documentType === documentName && movement.documentId === id)
        );
        this.registerMovements.set(registerName, filtered);
      }

      this.runHook(
        definition.hooks.onUnpost,
        { actor, objectName: documentName },
        this.buildDocumentHookApi(record, [])
      );

      record.posted = false;
      record.updatedAt = nowIso();
      store.set(id, record);
      this.audit(actor, "document.unpost", "document", documentName, id);
      return clone(record);
    } catch (error) {
      store.set(id, recordSnapshot);
      this.restoreRegisterMovements(registerSnapshot);
      this.audit(actor, "document.unpost.failed", "document", documentName, id, {
        error: error instanceof Error ? error.message : "Unknown unpost error"
      });
      throw error;
    }
  }

  getRegisterMovements(registerName: string): RegisterMovementRecord[] {
    this.ensureRegisterExists(registerName);
    return clone(this.registerMovements.get(registerName) ?? []);
  }

  getRegisterBalance(
    registerName: string,
    filter: Record<string, unknown>
  ): Record<string, number> {
    this.ensureRegisterExists(registerName);
    const register = this.getMetadata().registers.find((item) => item.name === registerName);
    if (!register) {
      throw new Error(`Register not found: ${registerName}`);
    }
    const totals: Record<string, number> = Object.fromEntries(
      register.resources.map((resource) => [resource, 0])
    );

    for (const movement of this.registerMovements.get(registerName) ?? []) {
      if (!matchesFilter(movement.dimensions, filter)) {
        continue;
      }
      for (const resource of register.resources) {
        totals[resource] += movement.resources[resource] ?? 0;
      }
    }
    return totals;
  }

  getAuditLog(): AuditEntry[] {
    return clone(this.auditLog);
  }

  getScriptMetrics(): ScriptExecutionMetric[] {
    return clone(this.scriptMetrics);
  }

  private findCatalog(name: string): CatalogDefinition {
    const definition = this.getMetadata().catalogs.find((item) => item.name === name);
    if (!definition) {
      throw new Error(`Catalog is not defined by metadata: ${name}`);
    }
    return definition;
  }

  private findDocument(name: string): DocumentDefinition {
    const definition = this.getMetadata().documents.find((item) => item.name === name);
    if (!definition) {
      throw new Error(`Document is not defined by metadata: ${name}`);
    }
    return definition;
  }

  private getCatalogStore(name: string): Map<string, PlatformRecord> {
    const store = this.catalogs.get(name);
    if (!store) {
      throw new Error(`Catalog store missing: ${name}`);
    }
    return store;
  }

  private getDocumentStore(name: string): Map<string, DocumentRecord> {
    const store = this.documents.get(name);
    if (!store) {
      throw new Error(`Document store missing: ${name}`);
    }
    return store;
  }

  private ensureRegisterExists(name: string): void {
    if (!this.registerMovements.has(name)) {
      throw new Error(`Register store missing: ${name}`);
    }
  }

  private snapshotRegisterMovements(): Map<string, RegisterMovementRecord[]> {
    const snapshot = new Map<string, RegisterMovementRecord[]>();
    for (const [registerName, movements] of this.registerMovements.entries()) {
      snapshot.set(registerName, clone(movements));
    }
    return snapshot;
  }

  private restoreRegisterMovements(snapshot: Map<string, RegisterMovementRecord[]>): void {
    this.registerMovements.clear();
    for (const [registerName, movements] of snapshot.entries()) {
      this.registerMovements.set(registerName, clone(movements));
    }
  }

  private validatePayload(
    fields: Array<{ name: string; type: string; required: boolean }>,
    payload: Record<string, unknown>
  ): void {
    for (const field of fields) {
      const value = payload[field.name];
      if (field.required && (value === undefined || value === null)) {
        throw new Error(`Required field missing: ${field.name}`);
      }
      if (value === undefined || value === null) {
        continue;
      }
      const typeOk =
        (field.type === "string" && typeof value === "string") ||
        (field.type === "number" && typeof value === "number") ||
        (field.type === "boolean" && typeof value === "boolean") ||
        (field.type === "date" && typeof value === "string") ||
        (field.type === "array" && Array.isArray(value)) ||
        (field.type === "object" && typeof value === "object" && !Array.isArray(value));
      if (!typeOk) {
        throw new Error(`Invalid field type for ${field.name}. Expected ${field.type}.`);
      }
    }
  }

  private buildDocumentHookApi(
    record: DocumentRecord,
    pendingMovements: RegisterMovement[]
  ): Record<string, unknown> {
    return {
      document: record.data,
      setField: (name: string, value: unknown): void => {
        record.data[name] = value;
      },
      addMovement: (movement: RegisterMovement): void => {
        this.ensureRegisterExists(movement.register);
        pendingMovements.push(clone(movement));
      },
      getBalance: (registerName: string, filter: Record<string, unknown>): Record<string, number> => {
        return this.getRegisterBalance(registerName, filter);
      },
      reject: (message: string): never => {
        throw new Error(message);
      }
    };
  }

  private pushMovement(
    record: DocumentRecord,
    documentName: string,
    movement: RegisterMovement
  ): void {
    const direction = movement.kind === "in" ? 1 : -1;
    const normalizedResources = Object.fromEntries(
      Object.entries(movement.resources).map(([resource, value]) => [
        resource,
        Number(value) * direction
      ])
    );
    const movementRecord: RegisterMovementRecord = {
      id: randomUUID(),
      register: movement.register,
      kind: movement.kind,
      dimensions: clone(movement.dimensions),
      resources: normalizedResources,
      documentType: documentName,
      documentId: record.id,
      timestamp: nowIso()
    };

    this.registerMovements.get(movement.register)?.push(movementRecord);
  }

  private runHook(
    hookName: string | undefined,
    hookContext: HookContext,
    payload: Record<string, unknown>
  ): void {
    if (!hookName) {
      return;
    }
    const sourceCode = this.scriptRegistry.get(hookName);
    if (!sourceCode) {
      throw new Error(`Hook script is not registered: ${hookName}`);
    }
    const startedAt = Date.now();
    try {
      this.scriptEngine.run({
        sourceCode,
        context: {
          ...payload,
          context: hookContext
        },
        timeoutMs: 100
      });
      this.scriptMetrics.push({
        id: randomUUID(),
        timestamp: new Date(startedAt).toISOString(),
        hookName,
        objectName: hookContext.objectName,
        actor: hookContext.actor,
        durationMs: Date.now() - startedAt,
        status: "ok"
      });
    } catch (error) {
      this.scriptMetrics.push({
        id: randomUUID(),
        timestamp: new Date(startedAt).toISOString(),
        hookName,
        objectName: hookContext.objectName,
        actor: hookContext.actor,
        durationMs: Date.now() - startedAt,
        status: "error",
        errorMessage: error instanceof Error ? error.message : "Unknown script error"
      });
      throw error;
    }
  }

  assertPermission(
    roleName: string,
    objectType: PlatformObjectType,
    objectName: string,
    action: PlatformAction
  ): void {
    const metadata = this.getMetadata();
    if (roleName === "Admin") {
      return;
    }
    const role = metadata.roles.find((item) => item.name === roleName);
    if (!role) {
      throw new Error(`Role not found: ${roleName}`);
    }
    const isAllowed = role.permissions.some(
      (permission) =>
        permission.objectType === objectType &&
        permission.object === objectName &&
        permission.actions.includes(action)
    );
    if (!isAllowed) {
      throw new Error(
        `Access denied. role=${roleName} action=${action} objectType=${objectType} object=${objectName}`
      );
    }
  }

  private audit(
    actor: string,
    action: string,
    objectType: PlatformObjectType,
    objectName: string,
    objectId?: string,
    details?: Record<string, unknown>
  ): void {
    this.auditLog.push({
      id: randomUUID(),
      timestamp: nowIso(),
      actor,
      action,
      objectType,
      objectName,
      objectId,
      details
    });
  }

  close(): void {
    this.metadataMigrator.close();
  }
}

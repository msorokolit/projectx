import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { appMetadataSchema, type AppMetadata } from "./types";

export function loadMetadataFromFile(path: string): AppMetadata {
  const absolutePath = resolve(path);
  const fileContent = readFileSync(absolutePath, "utf-8");
  const parsed = JSON.parse(fileContent) as unknown;
  return appMetadataSchema.parse(parsed);
}

export function parseMetadata(payload: unknown): AppMetadata {
  return appMetadataSchema.parse(payload);
}

import { appMetadataSchema, type AppMetadata } from "../../../../src/types";

export function validateMetadata(payload: unknown): AppMetadata {
  return appMetadataSchema.parse(payload);
}

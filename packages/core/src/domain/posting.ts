import { type RegisterMovementRecord } from "../../../../src/types";

export function summarizePostedResources(
  movements: RegisterMovementRecord[],
  resource: string
): number {
  return movements.reduce((sum, movement) => sum + (movement.resources[resource] ?? 0), 0);
}

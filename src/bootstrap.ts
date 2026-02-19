import { resolve } from "node:path";
import { loadMetadataFromFile } from "./metadata";
import { PlatformRuntime } from "./platform";

export function bootstrapTradeManagement(runtime: PlatformRuntime): void {
  const metadataPath = resolve("examples/trade-management/metadata/trade-management.json");
  const metadata = loadMetadataFromFile(metadataPath);
  runtime.setMetadata(metadata, "bootstrap");

  runtime.registerScriptFromFile(
    "warehouseReceipt.beforePost",
    resolve("examples/trade-management/scripts/warehouseReceipt.beforePost.js")
  );
  runtime.registerScriptFromFile(
    "salesInvoice.beforePost",
    resolve("examples/trade-management/scripts/salesInvoice.beforePost.js")
  );
}

import { createApp } from "./app";
import { bootstrapTradeManagement } from "./bootstrap";
import { readConfig } from "./config";
import { PlatformRuntime } from "./platform";

export async function startServer(): Promise<void> {
  const config = readConfig();
  const runtime = new PlatformRuntime();
  bootstrapTradeManagement(runtime);
  const app = createApp(runtime);
  await app.listen({ port: config.PORT, host: config.HOST });
  // eslint-disable-next-line no-console
  console.log(`1C clone server started at http://${config.HOST}:${config.PORT}`);
}

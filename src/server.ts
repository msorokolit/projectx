import { createApp } from "./app";
import { bootstrapTradeManagement } from "./bootstrap";
import { PlatformRuntime } from "./platform";

async function main(): Promise<void> {
  const runtime = new PlatformRuntime();
  bootstrapTradeManagement(runtime);
  const app = createApp(runtime);
  const port = Number(process.env.PORT ?? 3000);
  const host = process.env.HOST ?? "0.0.0.0";
  await app.listen({ port, host });
  // eslint-disable-next-line no-console
  console.log(`1C clone server started at http://${host}:${port}`);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});

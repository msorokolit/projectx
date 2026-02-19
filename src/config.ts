import { z } from "zod";

const envSchema = z.object({
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(8).default("dev-local-secret")
});

export type AppConfig = z.infer<typeof envSchema>;

export function readConfig(env = process.env): AppConfig {
  return envSchema.parse(env);
}

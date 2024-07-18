import { z } from "zod";

export const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  INFERABLE_API_SECRET: z.string(),
  INFERABLE_API_ENDPOINT: z
    .string()
    .optional()
    .default("https://api.inferable.ai"),
  PORT: z.coerce.number().default(8173),
});

export const env = envSchema.parse(process.env);

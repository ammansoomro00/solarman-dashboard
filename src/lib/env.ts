import "server-only";
import { z } from "zod";

const schema = z
  .object({
    DATABASE_URL: z.string().min(1),
    SOLAR_DATA_SOURCE: z.enum(["solarman", "demo"]).default("demo"),
    SOLARMAN_BASE_URL: z.url().default("https://globalapi.solarmanpv.com"),
    SOLARMAN_APP_ID: z.string().optional(),
    SOLARMAN_APP_SECRET: z.string().optional(),
    SOLARMAN_EMAIL: z.string().optional(),
    SOLARMAN_PASSWORD_SHA256: z
      .string()
      .regex(/^[0-9a-f]{64}$/, "must be a lowercase SHA-256 hex string")
      .optional()
      .or(z.literal("")),
    SOLARMAN_ORG_ID: z.string().optional(),
    SOLARMAN_STATION_ID: z.string().optional(),
    SYNC_INTERVAL_MINUTES: z.coerce.number().min(1).max(120).default(5),
  })
  .superRefine((env, ctx) => {
    if (env.SOLAR_DATA_SOURCE !== "solarman") return;
    for (const key of ["SOLARMAN_APP_ID", "SOLARMAN_APP_SECRET", "SOLARMAN_EMAIL", "SOLARMAN_PASSWORD_SHA256"] as const) {
      if (!env[key]) ctx.addIssue({ code: "custom", path: [key], message: "required when SOLAR_DATA_SOURCE=solarman" });
    }
  });

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env);
    if (!parsed.success) {
      throw new Error(`Invalid environment configuration:\n${z.prettifyError(parsed.error)}`);
    }
    cached = parsed.data;
  }
  return cached;
}

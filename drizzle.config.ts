import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  out: "./migrations",
  schema: [
    "./shared/schema.ts",
    "./shared/astrodb-schema.ts",
    "./shared/design-schema.ts",
    "./shared/ops-schema.ts",
    "./shared/calib-schema.ts",
    "./shared/targets-schema.ts",
    "./shared/planqa-schema.ts",
    "./shared/sky-visualizers-schema.ts",
    "./shared/generative-design-schema.ts",
  ],
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});

import { defineConfig } from "drizzle-kit";

const DATABASE_URL = process.env["DATABASE_URL"];
if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL environment variable. Set it in your .env file.");
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle/migrations",
  dbCredentials: { url: DATABASE_URL },
  strict: true,
  verbose: true,
});

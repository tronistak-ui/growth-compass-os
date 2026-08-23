// Server-only Postgres/Drizzle client. Import only from *.server.ts modules
// or server route/function handlers — never from route files or client code,
// since this pulls in the `postgres` driver (Node-only).
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";

function createDb() {
  const DATABASE_URL = process.env["DATABASE_URL"];
  if (!DATABASE_URL) {
    throw new Error("Missing DATABASE_URL environment variable. Set it in your .env file.");
  }
  const client = postgres(DATABASE_URL);
  return drizzle(client, { schema });
}

let _db: ReturnType<typeof createDb> | undefined;

export const db = new Proxy({} as ReturnType<typeof createDb>, {
  get(_, prop, receiver) {
    if (!_db) _db = createDb();
    return Reflect.get(_db, prop, receiver);
  },
});

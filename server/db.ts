import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

const databaseUrl = process.env.DATABASE_URL;
const runningWithoutDb = !databaseUrl;

if (runningWithoutDb) {
  console.warn("[DB] DATABASE_URL is not set. Running in no-DB mode for local preview.");
}

const ssl = databaseUrl
  ? databaseUrl.includes("railway.internal")
    ? false
    : { rejectUnauthorized: false }
  : false;

export const pool: Pick<Pool, "query"> | Pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl, ssl })
  : ({
      query: async () => ({ rows: [] }),
    } as any);

export const db = databaseUrl
  ? drizzle(pool as Pool, { schema })
  : null;

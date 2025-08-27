// lib/db.ts
import { createClient } from "@vercel/postgres";

// Prefer the pooled Neon URL. Fall back to DATABASE_URL / NON_POOLING if needed.
const connectionString =
  process.env.POSTGRES_URL ||
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL_NON_POOLING ||
  "";

// Keep the exact type of the sql tag so generics still work: sql<T>`...`
type SqlTag = ReturnType<typeof createClient>["sql"];

function makeThrowingSql(): SqlTag {
  // A template tag that throws a clear error if called w/o a connection string
  const fn: any = () => {
    throw Object.assign(
      new Error(
        "DB connection string missing. Set POSTGRES_URL (pooled Neon URL) or DATABASE_URL in your Vercel Environment Variables."
      ),
      { code: "missing_connection_string" }
    );
  };
  // Mirror common helpers so accidental calls also throw nicely
  fn.array = fn;
  fn.unsafe = fn;
  fn.file = fn;
  return fn as SqlTag;
}

const client = connectionString ? createClient({ connectionString }) : null;

// Export a typed sql tag that your code can use with generics like sql<MyRow>
export const sql: SqlTag = client ? client.sql : makeThrowingSql();

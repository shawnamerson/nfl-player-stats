// lib/db.ts
import { createClient, createPool } from "@vercel/postgres";

// Trim helper
const t = (s?: string) => (typeof s === "string" ? s.trim() : "");

// Prefer pooled (-pooler) in production
const POOLED_URL =
  t(process.env.POSTGRES_URL) ||
  t(process.env.POSTGRES_PRISMA_URL) ||
  "";

const UNPOOLED_URL =
  t(process.env.POSTGRES_URL_NON_POOLING) ||
  t(process.env.DATABASE_URL) ||
  t(process.env.DATABASE_URL_UNPOOLED) ||
  "";

// Type of the *function* returned by .sql
type SqlTag = ReturnType<typeof createPool>["sql"];

// Bind helper so `this` is the pool/client instance
function bindSql<T extends { sql: (...args: any[]) => any }>(obj: T): SqlTag {
  return obj.sql.bind(obj) as SqlTag;
}

// Throwing stub that matches the SqlTag surface
function throwingSql(): SqlTag {
  const fn: any = () => {
    const flags = {
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      POSTGRES_URL_NON_POOLING: !!process.env.POSTGRES_URL_NON_POOLING,
      DATABASE_URL: !!process.env.DATABASE_URL,
      NEXT_RUNTIME: (process as any)?.env?.NEXT_RUNTIME || "unknown",
    };
    throw Object.assign(
      new Error(
        "No database connection string found. Set POSTGRES_URL (pooled -pooler URL with sslmode=require) " +
          "or POSTGRES_URL_NON_POOLING / DATABASE_URL."
      ),
      { code: "missing_connection_string", flags }
    );
  };
  fn.array = fn; fn.file = fn; fn.unsafe = fn; fn.bind = () => fn;
  return fn as SqlTag;
}

// Export a mode hint for diagnostics
export const DB_MODE: "pooled" | "unpooled" | "none" =
  POOLED_URL ? "pooled" : UNPOOLED_URL ? "unpooled" : "none";

// Create the correct client and **bind** its sql
export const sql: SqlTag =
  DB_MODE === "pooled"
    ? bindSql(createPool({ connectionString: POOLED_URL }))
    : DB_MODE === "unpooled"
    ? bindSql(createClient({ connectionString: UNPOOLED_URL }))
    : throwingSql();

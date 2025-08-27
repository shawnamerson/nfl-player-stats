// lib/db.ts
import { createClient, createPool } from "@vercel/postgres";

// Trim helper
const t = (s?: string) => (typeof s === "string" ? s.trim() : "");

// Prefer pooled (-pooler) for production pages
const POOLED_URL =
  t(process.env.POSTGRES_URL) ||               // pooled (recommended)
  t(process.env.POSTGRES_PRISMA_URL) ||        // sometimes used
  "";

const UNPOOLED_URL =
  t(process.env.POSTGRES_URL_NON_POOLING) ||   // unpooled
  t(process.env.DATABASE_URL) ||               // common fallback
  t(process.env.DATABASE_URL_UNPOOLED) ||      // just in case
  "";

// The function type of .sql
type SqlTag = ReturnType<typeof createPool>["sql"];

// Throwing stub that preserves the same surface for typing
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

// Export the correctly typed tag
export const sql: SqlTag = POOLED_URL
  ? createPool({ connectionString: POOLED_URL }).sql
  : UNPOOLED_URL
  ? createClient({ connectionString: UNPOOLED_URL }).sql
  : throwingSql();

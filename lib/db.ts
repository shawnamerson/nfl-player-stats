// lib/db.ts
import { createClient, createPool, sql as _sql } from "@vercel/postgres";

// Prefer pooled for runtime pages (POSTGRES_URL should be the -pooler URL)
const POOLED_URL =
  process.env.POSTGRES_URL ||
  process.env.POSTGRES_PRISMA_URL || // if you mapped it here
  "";

const UNPOOLED_URL =
  process.env.POSTGRES_URL_NON_POOLING ||
  process.env.DATABASE_URL || // if you only set DATABASE_URL
  process.env.DATABASE_URL_UNPOOLED ||
  "";

// Use the same type as the official tag so generics keep working: sql<MyRow>`...`
type SQLTag = typeof _sql;

function throwingSql(): SQLTag {
  const fn: any = () => {
    throw Object.assign(
      new Error(
        "DB connection string missing. Set POSTGRES_URL (pooled Neon URL ending with -pooler & sslmode=require) " +
          "or POSTGRES_URL_NON_POOLING / DATABASE_URL (unpooled) in Vercel."
      ),
      { code: "missing_connection_string" }
    );
  };
  fn.array = fn;
  fn.unsafe = fn;
  fn.file = fn;
  return fn as SQLTag;
}

// If you gave us a pooled URL, use createPool(); otherwise if you gave an unpooled URL, use createClient().
export const sql = POOLED_URL
  ? createPool({ connectionString: POOLED_URL }).sql
  : UNPOOLED_URL
  ? createClient({ connectionString: UNPOOLED_URL }).sql
  : throwingSql();

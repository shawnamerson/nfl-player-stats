// lib/db.ts
import { Pool, type QueryResult } from "pg";

// Re-use a single pool in dev/hot-reload
declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

// Prefer Supabase pooled connection (port 6543)
const connectionString =
  (process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || "").trim();

if (!global.__pgPool && connectionString) {
  global.__pgPool = new Pool({
    connectionString,
    // Supabase requires SSL in hosted environments; the flag below works for Supabase-managed certs
    ssl: { rejectUnauthorized: false },
    // Optional: tweak if you like
    // max: 10,
    // idleTimeoutMillis: 30_000,
  });
}

const pool = global.__pgPool;

type Row = Record<string, unknown>;

// Build a parameterized query out of a template tag
function buildQuery(strings: TemplateStringsArray, values: unknown[]) {
  let text = "";
  const params: unknown[] = [];
  strings.forEach((s, i) => {
    text += s;
    if (i < values.length) {
      params.push(values[i]);
      text += `$${params.length}`;
    }
  });
  return { text, values: params };
}

// The sql tag you can keep using: sql<MyRow>`SELECT ... WHERE x=${y}`
export async function sql<O extends Row = Row>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<QueryResult<O>> {
  if (!pool) {
    const flags = {
      hasDATABASE_URL: !!process.env.DATABASE_URL,
      hasSUPABASE_DB_URL: !!process.env.SUPABASE_DB_URL,
    };
    throw Object.assign(
      new Error(
        "No DB connection string. Set DATABASE_URL (recommended) or SUPABASE_DB_URL to your Supabase pooled URL (port 6543, sslmode=require)."
      ),
      { code: "missing_connection_string", flags }
    );
  }
  const { text, values: params } = buildQuery(strings, values);
  return pool.query<O>({ text, values: params });
}

// Optional helpers mirroring common patterns
(sql as any).unsafe = async <O extends Row = Row>(text: string, params: unknown[] = []) => {
  if (!pool) throw new Error("DB not initialized");
  return pool.query<O>({ text, values: params });
};

export type { QueryResult };

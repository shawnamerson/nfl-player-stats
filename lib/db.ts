// lib/db.ts
import { Pool, type PoolConfig, type QueryResult } from "pg";

/*
Behavior:
- Production (NODE_ENV=production): TLS verification ON by default.
- Development: TLS is relaxed (no-verify) by default to avoid self-signed/chain issues.
- Overrides:
  - PGSSLMODE: verify-full | require | no-verify | disable
  - DATABASE_CA_PEM: PEM string (plain or base64) for custom CA when using verify-full/require
*/

declare global {
  // eslint-disable-next-line no-var
  var __pgPool: Pool | undefined;
}

type Row = Record<string, unknown>;

const DB_URL =
  process.env.DATABASE_URL?.trim() ||
  process.env.SUPABASE_DB_URL?.trim() ||
  process.env.POSTGRES_URL?.trim() ||
  "";

// --- SSL helpers -------------------------------------------------------------

function isProbablyBase64(s: string) {
  return /^[A-Za-z0-9+/=\r\n]+$/.test(s) && s.length % 4 === 0;
}

function readCaPem(): string | undefined {
  const raw = process.env.DATABASE_CA_PEM?.trim();
  if (!raw) return undefined;
  return isProbablyBase64(raw) ? Buffer.from(raw, "base64").toString("utf8") : raw;
}

/**
 * Build pg SSL config based on environment.
 * - Dev default: no-verify (rejectUnauthorized: false)
 * - Prod default: verify (rejectUnauthorized: true or {} which implies verify)
 * Respect PGSSLMODE if provided.
 */
function buildSsl() {
  const mode = (process.env.PGSSLMODE || process.env.DB_SSL_MODE || "").toLowerCase();
  const ca = readCaPem();
  const isProd = process.env.NODE_ENV === "production";

  if (mode) {
    switch (mode) {
      case "disable":
        return false as const;
      case "no-verify":
        return { rejectUnauthorized: false } as const;
      case "require":
        // TLS required, allow system trust store; include CA if provided
        return ca ? ({ ca } as const) : ({} as const);
      case "verify-full":
        return ca
          ? ({ ca, rejectUnauthorized: true } as const)
          : ({ rejectUnauthorized: true } as const);
      default:
        // Unknown value → fall through to defaults
        break;
    }
  }

  // Defaults when PGSSLMODE not set
  if (isProd) {
    // secure default; include CA if provided
    return ca ? ({ ca, rejectUnauthorized: true } as const) : ({} as const);
  }
  // Dev default: relax verification to avoid self-signed chain errors
  return { rejectUnauthorized: false } as const;
}

// --- Pool config -------------------------------------------------------------

function toPoolConfig(urlStr: string): PoolConfig {
  const u = new URL(urlStr);
  const db = decodeURIComponent(u.pathname.replace(/^\//, "") || "postgres");

  return {
    host: u.hostname,
    port: Number(u.port || 5432),
    user: decodeURIComponent(u.username),
    password: decodeURIComponent(u.password),
    database: db,
    ssl: buildSsl(), // explicit object or false
    // Optional tuning (env-driven if you like):
    // max: parseInt(process.env.PGPOOL_MAX || "10", 10),
    // idleTimeoutMillis: parseInt(process.env.PGPOOL_IDLE || "30000", 10),
    // connectionTimeoutMillis: parseInt(process.env.PGPOOL_CONNECT_TIMEOUT || "10000", 10),
  };
}

// --- Query builder/tag -------------------------------------------------------

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

function getPool(): Pool {
  if (!global.__pgPool) {
    if (!DB_URL) {
      const flags = {
        has_DATABASE_URL: !!process.env.DATABASE_URL,
        has_SUPABASE_DB_URL: !!process.env.SUPABASE_DB_URL,
        has_POSTGRES_URL: !!process.env.POSTGRES_URL,
      };
      throw Object.assign(
        new Error(
          "No DB connection string. Set DATABASE_URL (recommended). For Supabase pooled connections use the pooled URL (port 6543) with SSL."
        ),
        { code: "missing_connection_string", flags }
      );
    }
    // Important: use explicit fields (not connectionString) so our ssl object wins
    global.__pgPool = new Pool(toPoolConfig(DB_URL));
  }
  return global.__pgPool;
}

/** Tagged template: sql<MyRow>`SELECT ... WHERE col = ${val}` */
export async function sql<O extends Row = Row>(
  strings: TemplateStringsArray,
  ...values: unknown[]
): Promise<QueryResult<O>> {
  const pool = getPool();
  const { text, values: params } = buildQuery(strings, values);
  return pool.query<O>({ text, values: params as any[] });
}

/** Optional raw helper */
(sql as any).unsafe = async <O extends Row = Row>(text: string, params: unknown[] = []) => {
  const pool = getPool();
  return pool.query<O>({ text, values: params as any[] });
};

/** For tests/scripts to gracefully close the pool */
export async function endPool() {
  if (global.__pgPool) {
    await global.__pgPool.end();
    global.__pgPool = undefined;
  }
}

export type { QueryResult };

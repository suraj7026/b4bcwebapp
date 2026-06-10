import "server-only";
import { Pool, type QueryResultRow } from "pg";

const requiredConnectionString = () => {
  const v = process.env.APP_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!v) throw new Error("Missing required env var APP_DATABASE_URL");
  return v;
};

declare global {
  var __postgresPool: Pool | undefined;
}

function shouldUseSsl(): boolean {
  const value = process.env.APP_DATABASE_SSL ?? process.env.PGSSLMODE;
  return value === "require" || value === "true";
}

function makePool(): Pool {
  return new Pool({
    connectionString: requiredConnectionString(),
    max: Number(process.env.APP_DATABASE_POOL_SIZE ?? 4),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: Number(
      process.env.APP_DATABASE_CONNECT_TIMEOUT_MS ?? 2500
    ),
    statement_timeout: Number(process.env.APP_DATABASE_QUERY_TIMEOUT_MS ?? 5000),
    query_timeout: Number(process.env.APP_DATABASE_QUERY_TIMEOUT_MS ?? 5000),
    ssl: shouldUseSsl() ? { rejectUnauthorized: false } : undefined,
  });
}

export function getPostgresPool(): Pool {
  if (!globalThis.__postgresPool) {
    globalThis.__postgresPool = makePool();
  }
  return globalThis.__postgresPool;
}

export async function pgQuery<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: readonly unknown[] = []
): Promise<T[]> {
  const result = await getPostgresPool().query<T>(sql, [...params]);
  return result.rows;
}

export async function pgQueryOne<T extends QueryResultRow = QueryResultRow>(
  sql: string,
  params: readonly unknown[] = []
): Promise<T | null> {
  const rows = await pgQuery<T>(sql, params);
  return rows[0] ?? null;
}

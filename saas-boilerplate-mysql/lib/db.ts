import mysql from "mysql2/promise";

// A single shared connection pool for the whole server process. Reusing
// one pool (rather than creating a connection per request) is the correct
// pattern for serverless/long-running Next.js servers.
//
// Required env vars (see .env.example):
//   DATABASE_HOST, DATABASE_USER, DATABASE_PASSWORD, DATABASE_NAME
// Optional:
//   DATABASE_PORT (default 3306)
let pool: mysql.Pool | null = null;

export function getDb(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DATABASE_HOST,
      port: process.env.DATABASE_PORT
        ? Number(process.env.DATABASE_PORT)
        : 3306,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      // `json: false` + namedPlaceholders let us write queries with
      // `:param` placeholders and read results as plain rows.
      namedPlaceholders: true,
      enableKeepAlive: true,
      ssl:
        process.env.DATABASE_SSL === "true"
          ? { rejectUnauthorized: true }
          : undefined,
    });
  }
  return pool;
}

// Shortcut for one-off queries: getDb().execute(sql, params).
export async function query<T = any>(
  sql: string,
  params: Record<string, any> | any[] = {}
): Promise<[T, any]> {
  return getDb().execute(sql, params as any) as Promise<[T, any]>;
}

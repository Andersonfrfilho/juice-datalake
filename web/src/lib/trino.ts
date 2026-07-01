import { BasicAuth } from "trino-client";

export interface QueryColumn {
  name: string;
  type: string;
}

export interface QueryResult {
  columns: QueryColumn[];
  rows: Record<string, unknown>[];
  queryId: string;
}

const TRINO_URL = process.env.TRINO_URL || "http://localhost:8080";
const TRINO_USER = process.env.TRINO_USER || "admin";
const TRINO_CATALOG = process.env.TRINO_CATALOG || "postgresql";
const TRINO_SCHEMA = process.env.TRINO_SCHEMA || "public";
const TRINO_QUERY_TIMEOUT_MS = Number(process.env.TRINO_QUERY_TIMEOUT_MS) || 30000;

let trinoClient: any = null;

async function getClient() {
  if (trinoClient) return trinoClient;

  const { Trino } = await import("trino-client");

  trinoClient = Trino.create({
    server: TRINO_URL,
    auth: new BasicAuth(TRINO_USER),
    catalog: TRINO_CATALOG,
    schema: TRINO_SCHEMA,
  });

  return trinoClient;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 2000;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer!);
  }
}

async function runQuery(client: any, sql: string): Promise<QueryResult> {
  const iterator = await client.query(sql);

  const columns: QueryColumn[] = [];
  const rows: Record<string, unknown>[] = [];
  let queryId = "";

  for await (const result of iterator) {
    if (result.error) {
      throw new Error(`Trino query error: ${result.error.message || JSON.stringify(result.error)}`);
    }

    if (result.columns && !columns.length) {
      for (const col of result.columns) {
        if (col) {
          columns.push({ name: col.name, type: col.type });
        }
      }
    }

    if (result.data) {
      for (const row of result.data) {
        const obj: Record<string, unknown> = {};
        columns.forEach((col, idx) => {
          obj[col.name] = row[idx];
        });
        rows.push(obj);
      }
    }

    if (result.id) {
      queryId = result.id;
    }
  }

  return { columns, rows, queryId };
}

export async function executeQuery(sql: string): Promise<QueryResult> {
  // Safety: block any DDL/DML statements
  const upperSQL = sql.trim().toUpperCase();
  const dangerous = [
    "INSERT ", "UPDATE ", "DELETE ", "DROP ", "CREATE ",
    "ALTER ", "TRUNCATE ", "GRANT ", "REVOKE ",
  ];
  for (const keyword of dangerous) {
    if (upperSQL.startsWith(keyword)) {
      throw new Error(`Operation not allowed: ${keyword.trim()}`);
    }
  }
  if (!upperSQL.startsWith("SELECT") && !upperSQL.startsWith("SHOW") && !upperSQL.startsWith("DESCRIBE") && !upperSQL.startsWith("EXPLAIN") && !upperSQL.startsWith("WITH")) {
    throw new Error("Only SELECT, SHOW, DESCRIBE, EXPLAIN, and WITH queries are allowed");
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const client = await getClient();
      return await withTimeout(runQuery(client, sql), TRINO_QUERY_TIMEOUT_MS, "Trino query");
    } catch (err: any) {
      lastError = err;
      if (attempt < MAX_RETRIES) {
        console.warn(`Trino query attempt ${attempt + 1} failed, retrying in ${RETRY_DELAY_MS}ms...`);
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  throw lastError || new Error("Trino query failed after retries");
}

export async function healthCheck(): Promise<boolean> {
  try {
    await executeQuery("SELECT 1");
    return true;
  } catch {
    return false;
  }
}

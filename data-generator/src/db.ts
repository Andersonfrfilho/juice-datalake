import pg from "pg";
import { S3Client, CreateBucketCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

export function getPool(): pg.Pool {
  return new Pool({
    host: process.env.PG_HOST || "localhost",
    port: parseInt(process.env.PG_PORT || "5432", 10),
    user: process.env.PG_USER || "jadmin",
    password: process.env.PG_PASSWORD || "juice123",
    database: process.env.PG_DATABASE || "juicedb",
    max: 10,
  });
}

export function getS3Client(): S3Client {
  return new S3Client({
    endpoint: process.env.MINIO_ENDPOINT || "http://localhost:9000",
    region: process.env.MINIO_REGION || "us-east-1",
    credentials: {
      accessKeyId: process.env.MINIO_ACCESS_KEY || "minioadmin",
      secretAccessKey: process.env.MINIO_SECRET_KEY || "minioadmin123",
    },
    forcePathStyle: true,
  });
}

export async function ensureBucket(s3: S3Client, bucket: string): Promise<void> {
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
    console.log(`Bucket '${bucket}' created`);
  } catch (err: any) {
    if (err.name === "BucketAlreadyOwnedByYou" || err.Code === "BucketAlreadyOwnedByYou") {
      console.log(`Bucket '${bucket}' already exists`);
      return;
    }
    if (err.message?.includes("Your previous request to create the named bucket succeeded")) {
      console.log(`Bucket '${bucket}' already exists`);
      return;
    }
    throw err;
  }
}

export async function truncateAll(pool: pg.Pool): Promise<void> {
  await pool.query("TRUNCATE TABLE route_stores, routes, returns, sales, stores, products, representatives, cities RESTART IDENTITY CASCADE");
  console.log("Tables truncated");
}

export async function insertProducts(pool: pg.Pool, rows: any[]): Promise<number[]> {
  const ids: number[] = [];
  for (const row of rows) {
    const result = await pool.query(
      `INSERT INTO products (name, category, flavor, size_ml, cost_price, sell_price)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [row.name, row.category, row.flavor, row.size_ml, row.cost_price, row.sell_price]
    );
    ids.push(result.rows[0].id);
  }
  return ids;
}

export async function insertRepresentatives(pool: pg.Pool, rows: any[]): Promise<number[]> {
  const ids: number[] = [];
  for (const row of rows) {
    const result = await pool.query(
      `INSERT INTO representatives (name, email, phone, region, performance_score, hire_date)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [row.name, row.email, row.phone, row.region, row.performance_score, row.hire_date]
    );
    ids.push(result.rows[0].id);
  }
  return ids;
}

export async function insertStores(pool: pg.Pool, rows: any[]): Promise<number[]> {
  const ids: number[] = [];
  for (const row of rows) {
    const result = await pool.query(
      `INSERT INTO stores (name, city, state, region, type, representative_id, opened_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [row.name, row.city, row.state, row.region, row.type, row.representative_id, row.opened_at]
    );
    ids.push(result.rows[0].id);
  }
  return ids;
}

export async function insertSalesBatch(
  pool: pg.Pool,
  batch: { product_id: number; store_id: number; representative_id: number; quantity: number; unit_price: number; sale_date: string }[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const values: any[] = [];
    const placeholders: string[] = [];

    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const base = i * 6;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`);
      values.push(row.product_id, row.store_id, row.representative_id, row.quantity, row.unit_price, row.sale_date);
    }

    await client.query(
      `INSERT INTO sales (product_id, store_id, representative_id, quantity, unit_price, sale_date) VALUES ${placeholders.join(",")}`,
      values
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function insertReturnsBatch(
  pool: pg.Pool,
  batch: { product_id: number; store_id: number; representative_id: number; quantity: number; unit_price: number; reason: string; return_date: string }[]
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const values: any[] = [];
    const placeholders: string[] = [];

    for (let i = 0; i < batch.length; i++) {
      const row = batch[i];
      const base = i * 7;
      placeholders.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`);
      values.push(row.product_id, row.store_id, row.representative_id, row.quantity, row.unit_price, row.reason, row.return_date);
    }

    await client.query(
      `INSERT INTO returns (product_id, store_id, representative_id, quantity, unit_price, reason, return_date) VALUES ${placeholders.join(",")}`,
      values
    );
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function insertCities(pool: pg.Pool, rows: any[]): Promise<number[]> {
  const ids: number[] = [];
  for (const row of rows) {
    const result = await pool.query(
      `INSERT INTO cities (name, state, region, population_estimate)
       VALUES ($1, $2, $3, $4) ON CONFLICT (name, state) DO UPDATE SET population_estimate = $4 RETURNING id`,
      [row.name, row.state, row.region, row.population_estimate]
    );
    ids.push(result.rows[0].id);
  }
  return ids;
}

export async function insertRoutes(pool: pg.Pool, rows: any[]): Promise<number[]> {
  const ids: number[] = [];
  for (const row of rows) {
    const result = await pool.query(
      `INSERT INTO routes (name, representative_id, region, weekly_fuel_cost, weekly_toll_cost, weekly_vehicle_cost, weekly_distance_km)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
      [row.name, row.representative_id, row.region, row.weekly_fuel_cost, row.weekly_toll_cost, row.weekly_vehicle_cost, row.weekly_distance_km]
    );
    ids.push(result.rows[0].id);
  }
  return ids;
}

export async function insertRouteStores(pool: pg.Pool, rows: any[]): Promise<void> {
  for (const row of rows) {
    await pool.query(
      `INSERT INTO route_stores (route_id, store_id, visit_day, visit_order, visit_duration_min, distance_from_prev_km)
       VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (route_id, store_id) DO NOTHING`,
      [row.route_id, row.store_id, row.visit_day, row.visit_order, row.visit_duration_min, row.distance_from_prev_km]
    );
  }
}

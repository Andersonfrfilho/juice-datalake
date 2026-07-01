import { products } from "./seeds/products.js";
import { generateStores } from "./seeds/stores.js";
import { generateRepresentatives } from "./seeds/representatives.js";
import { generateSales } from "./seeds/sales.js";
import { generateReturns } from "./seeds/returns.js";
import { cities } from "./seeds/cities.js";
import { generateRoutes } from "./seeds/routes.js";
import { getPool, getS3Client, ensureBucket, truncateAll, insertProducts, insertRepresentatives, insertStores, insertSalesBatch, insertReturnsBatch, insertCities, insertRoutes, insertRouteStores } from "./db.js";
import { exportProductsJSON, exportStoresJSON, exportSalesJSON } from "./export.js";
import dotenv from "dotenv";

dotenv.config();

interface ProductWithId {
  id: number;
  name: string;
  category: string;
  flavor: string;
  size_ml: number;
  cost_price: number;
  sell_price: number;
}

interface StoreWithId {
  id: number;
  name: string;
  city: string;
  state: string;
  region: string;
  type: string;
  representative_id: number;
  opened_at: string;
}

async function main() {
  console.log("=== Juice Data Lake - Data Generator ===\n");
  const startTime = Date.now();

  const pool = getPool();
  const s3 = getS3Client();
  const bucket = process.env.MINIO_BUCKET || "datalake";

  try {
    console.log("[1/9] Connecting to PostgreSQL...");
    await pool.query("SELECT 1");
    console.log("  PostgreSQL connected");

    console.log("[2/9] Ensuring MinIO bucket...");
    await ensureBucket(s3, bucket);

    console.log("[3/9] Truncating existing data...");
    await truncateAll(pool);

    console.log("[4/9] Generating representatives...");
    const repsData = generateRepresentatives();
    const repIds = await insertRepresentatives(pool, repsData);
    const repsByRegion: Record<string, number[]> = {};
    repsData.forEach((r, i) => {
      if (!repsByRegion[r.region]) repsByRegion[r.region] = [];
      repsByRegion[r.region].push(repIds[i]);
    });
    console.log(`  ${repsData.length} representatives generated (across 5 regions)`);

    console.log(`[5/9] Inserting ${products.length} products...`);
    const productIds = await insertProducts(
      pool,
      products.map((p) => ({
        name: p.name, category: p.category, flavor: p.flavor,
        size_ml: p.size_ml, cost_price: p.cost_price, sell_price: p.sell_price,
      }))
    );
    const productsWithId: ProductWithId[] = products.map((p, i) => ({ id: productIds[i], ...p }));
    console.log(`  ${productsWithId.length} products inserted`);

    console.log("[6/9] Generating and inserting stores...");
    const storesData = generateStores(repsByRegion);
    const storeIds = await insertStores(pool, storesData);
    const storesWithId: StoreWithId[] = storesData.map((s, i) => ({ id: storeIds[i], ...s }));
    console.log(`  ${storesWithId.length} stores inserted across 5 regions`);

    // Build lookup for route generation
    const storesByCity: Record<string, number[]> = {};
    storesWithId.forEach((s) => {
      if (!storesByCity[s.city]) storesByCity[s.city] = [];
      storesByCity[s.city].push(s.id);
    });

    console.log("[7/9] Inserting cities...");
    await insertCities(pool, cities);
    console.log(`  ${cities.length} cities inserted`);

    console.log("[8/9] Generating routes and assigning stores...");
    const { routes: routesData, routeStores: routeStoresData } = generateRoutes(repsByRegion, storesByCity);
    const routeIds = await insertRoutes(pool, routesData);
    const routeStoresWithIds = routeStoresData.map((rs, i) => ({
      ...rs,
      route_id: rs.route_id,
    }));
    await insertRouteStores(pool, routeStoresWithIds);
    console.log(`  ${routesData.length} routes with ${routeStoresData.length} store assignments`);

    console.log("[9/9] Generating sales (this may take a few minutes)...");
    const startDate = "2024-01-01";
    const endDate = "2025-12-31";

    let totalSales = 0;
    const allSales: {
      product_id: number; store_id: number; representative_id: number; quantity: number;
      unit_price: number; total_amount: number; sale_date: string;
    }[] = [];

    const BATCH_SIZE = 5000;
    const generator = generateSales(productsWithId, storesWithId, startDate, endDate);

    for (const batch of generator) {
      await insertSalesBatch(pool, batch);
      allSales.push(...batch);
      totalSales += batch.length;
      if (totalSales % 50000 === 0) {
        console.log(`  ${totalSales.toLocaleString()} sales inserted...`);
      }
    }

    console.log(`  ${totalSales.toLocaleString()} total sales inserted into PostgreSQL`);

    // Generate returns (~2.5% of sales)
    console.log("\n=== Generating Returns (Devoluções) ===\n");
    let totalReturns = 0;
    const returnsGenerator = generateReturns(allSales, productsWithId, storesWithId);
    for (const batch of returnsGenerator) {
      await insertReturnsBatch(pool, batch);
      totalReturns += batch.length;
    }
    console.log(`  ${totalReturns.toLocaleString()} total returns inserted into PostgreSQL`);

    console.log("\n=== Exporting to MinIO (Data Lake) ===\n");
    console.log("Exporting products to MinIO...");
    await exportProductsJSON(s3, productsWithId);
    console.log("Exporting stores to MinIO...");
    await exportStoresJSON(s3, storesWithId);
    console.log("Exporting sales to MinIO (partitioned)...");
    await exportSalesJSON(s3, allSales);

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`\n=== Done in ${elapsed}s ===`);
    console.log(`Data Lake ready: PostgreSQL + MinIO (s3://${bucket}/)`);

    await pool.end();
  } catch (err) {
    console.error("Error:", err);
    await pool.end();
    process.exit(1);
  }
}

main();

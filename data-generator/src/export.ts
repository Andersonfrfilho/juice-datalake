import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const BUCKET = process.env.MINIO_BUCKET || "datalake";

async function s3PutJSON(s3: S3Client, key: string, data: any): Promise<void> {
  const body = Buffer.from(JSON.stringify(data), "utf-8");
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: "application/json",
    })
  );
  console.log(`  Uploaded s3://${BUCKET}/${key}`);
}

export async function exportProductsJSON(s3: S3Client, rows: any[]): Promise<void> {
  const data = rows.map((r, i) => ({
    id: i + 1,
    name: r.name,
    category: r.category,
    flavor: r.flavor,
    size_ml: r.size_ml,
    sell_price: r.sell_price,
  }));
  await s3PutJSON(s3, "products/products.json", data);
  console.log(`Exported ${data.length} products to MinIO (JSON)`);
}

export async function exportStoresJSON(s3: S3Client, rows: any[]): Promise<void> {
  const data = rows.map((r, i) => ({
    id: i + 1,
    name: r.name,
    city: r.city,
    state: r.state,
    region: r.region,
    type: r.type,
    opened_at: r.opened_at,
  }));
  await s3PutJSON(s3, "stores/stores.json", data);
  console.log(`Exported ${data.length} stores to MinIO (JSON)`);
}

export async function exportSalesJSON(
  s3: S3Client,
  rows: { product_id: number; store_id: number; quantity: number; unit_price: number; total_amount: number; sale_date: string }[]
): Promise<void> {
  // Partition by year/month
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const d = new Date(row.sale_date);
    const key = `sales/year=${d.getFullYear()}/month=${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  let total = 0;
  for (const [partKey, partRows] of groups) {
    await s3PutJSON(s3, `${partKey}/data.json`, partRows);
    total += partRows.length;
  }

  // Daily aggregations
  const aggMap = new Map<string, { total_quantity: number; total_revenue: number; transaction_count: number }>();
  for (const row of rows) {
    const key = `${row.sale_date}|${row.product_id}`;
    if (!aggMap.has(key)) {
      aggMap.set(key, { total_quantity: 0, total_revenue: 0, transaction_count: 0 });
    }
    const agg = aggMap.get(key)!;
    agg.total_quantity += row.quantity;
    agg.total_revenue += row.total_amount;
    agg.transaction_count += 1;
  }
  const dailyAgg = Array.from(aggMap.entries()).map(([k, v]) => {
    const [sale_date, product_id] = k.split("|");
    return { sale_date, product_id: parseInt(product_id), ...v };
  });
  await s3PutJSON(s3, "daily_aggregations/daily_sales.json", dailyAgg);

  console.log(`Exported ${total} sales records (${groups.size} partitions) to MinIO (JSON)`);
}

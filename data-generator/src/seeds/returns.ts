import { addDays, differenceInDays, format } from "date-fns";

interface Product {
  id: number;
  sell_price: number;
}

interface Store {
  id: number;
  representative_id: number;
}

interface SaleRecord {
  product_id: number;
  store_id: number;
  representative_id: number;
  quantity: number;
  unit_price: number;
  sale_date: string;
}

interface ReturnRecord {
  product_id: number;
  store_id: number;
  representative_id: number;
  quantity: number;
  unit_price: number;
  reason: string;
  return_date: string;
}

const returnReasons = [
  "produto_danificado",
  "vencido",
  "produto_errado",
  "devolucao_cliente",
  "outro",
];

const reasonWeights = [0.25, 0.15, 0.10, 0.40, 0.10];

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function pickWeighted(items: string[], weights: number[], rand: number): string {
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (rand <= cumulative) return items[i];
  }
  return items[items.length - 1];
}

export function* generateReturns(
  allSales: SaleRecord[],
  products: Product[],
  stores: Store[]
): Generator<ReturnRecord[]> {
  // ~2.5% return rate
  const RETURN_RATE = 0.025;
  const BATCH_SIZE = 5000;
  let batch: ReturnRecord[] = [];
  let count = 0;

  for (let i = 0; i < allSales.length; i++) {
    const sale = allSales[i];
    const seed = sale.product_id * 10000 + sale.store_id * 100 + i;
    const rand = seededRandom(seed);

    if (rand < RETURN_RATE) {
      // Return 1-2 units or partial quantity
      const returnQty = Math.min(
        Math.ceil(seededRandom(seed + 1) * 2),
        sale.quantity
      );
      if (returnQty === 0) continue;

      // Return date: 1-15 days after sale date
      const saleDate = new Date(sale.sale_date);
      const returnDate = addDays(saleDate, Math.ceil(seededRandom(seed + 2) * 14) + 1);

      const reason = pickWeighted(returnReasons, reasonWeights, seededRandom(seed + 3));

      batch.push({
        product_id: sale.product_id,
        store_id: sale.store_id,
        representative_id: sale.representative_id,
        quantity: returnQty,
        unit_price: sale.unit_price,
        reason,
        return_date: format(returnDate, "yyyy-MM-dd"),
      });

      count++;

      if (batch.length >= BATCH_SIZE) {
        yield batch;
        batch = [];
      }
    }
  }

  if (batch.length > 0) {
    yield batch;
  }

  console.log(`  Generated ${count.toLocaleString()} returns (~${RETURN_RATE * 100}% of sales)`);
}

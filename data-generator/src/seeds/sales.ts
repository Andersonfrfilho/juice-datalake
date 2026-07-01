import { addDays, format, getDay, getMonth, differenceInDays } from "date-fns";

interface Product {
  id: number;
  category: string;
  sell_price: number;
}

interface Store {
  id: number;
  region: string;
  representative_id: number;
  opened_at: string;
}

interface SaleBatch {
  product_id: number;
  store_id: number;
  representative_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
}

function getSeasonalityMultiplier(date: Date, category: string): number {
  const month = getMonth(date); // 0=Jan, 11=Dec

  // Summer (Dec-Feb): 0=Jan, 1=Feb, 11=Dec
  if (month === 11 || month === 0 || month === 1) {
    if (category === "tropical" || category === "citrico") return 1.5;
    if (category === "light") return 1.3;
    return 1.3;
  }
  // Fall (Mar-May): 2,3,4
  if (month >= 2 && month <= 4) {
    return 1.0;
  }
  // Winter (Jun-Aug): 5,6,7
  if (month >= 5 && month <= 7) {
    if (category === "premium") return 0.9;
    return 0.7;
  }
  // Spring (Sep-Nov): 8,9,10
  if (month >= 8 && month <= 10) {
    if (category === "tropical") return 1.2;
    return 1.1;
  }
  return 1.0;
}

function getGrowthTrend(date: Date, startDate: Date, endDate: Date): number {
  const totalDays = differenceInDays(endDate, startDate);
  const daysElapsed = differenceInDays(date, startDate);
  const progress = daysElapsed / totalDays;
  // 15% growth over 2 years
  return 1.0 + progress * 0.15;
}

function isPromotionWeek(date: Date): number | null {
  // ~5% of weeks have promotions
  const weekNum = Math.floor(differenceInDays(date, new Date("2024-01-01")) / 7);
  // Use deterministic pseudo-random based on week number
  const hash = (weekNum * 2654435761) >>> 0;
  const roll = (hash % 100) / 100;

  if (roll < 0.05) {
    return 0.10 + ((hash % 10) / 100); // 10-20% discount
  }
  return null;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 49297;
  return x - Math.floor(x);
}

function getBaseDailyQuantity(productId: number, storeId: number): number {
  const seed = productId * 1000 + storeId;
  const r = seededRandom(seed);
  // Base: 2-40 units per day per store-product
  return Math.floor(2 + r * 38);
}

export function* generateSales(
  products: Product[],
  stores: Store[],
  startDateStr: string,
  endDateStr: string
): Generator<SaleBatch[]> {
  const startDate = new Date(startDateStr);
  const endDate = new Date(endDateStr);
  const totalDays = differenceInDays(endDate, startDate) + 1;

  const BATCH_SIZE = 5000;
  let batch: SaleBatch[] = [];
  let totalGenerated = 0;

  for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
    const date = addDays(startDate, dayOffset);
    const dateStr = format(date, "yyyy-MM-dd");
    const dayOfWeek = getDay(date); // 0=Sun
    const promo = isPromotionWeek(date);

    const growth = getGrowthTrend(date, startDate, endDate);

    for (const product of products) {
      const seasonality = getSeasonalityMultiplier(date, product.category);
      const baseSellPrice = product.sell_price;

      for (const store of stores) {
        // Store must be open on this date
        if (store.opened_at > dateStr) continue;

        // Weekends sell 20% more
        const dayMultiplier = dayOfWeek === 0 || dayOfWeek === 6 ? 1.2 : 1.0;

        // Base quantity varies per product-store combo
        const baseQty = getBaseDailyQuantity(product.id, store.id);

        // Daily random variation ±20%
        const dailyRandom = 0.8 + seededRandom(product.id * 10000 + store.id * 100 + dayOffset) * 0.4;

        // Calculate final quantity
        let quantity = Math.round(
          baseQty * seasonality * growth * dayMultiplier * dailyRandom
        );
        if (quantity < 0) quantity = 0;

        // Calculate unit price
        let unitPrice = baseSellPrice;
        let promoMultiplier = 1.0;

        if (promo !== null) {
          unitPrice = +(baseSellPrice * (1 - promo)).toFixed(2);
          // During promotions, volume increases 30-50%
          promoMultiplier = 1.3 + seededRandom(product.id * store.id + dayOffset) * 0.2;
          quantity = Math.round(quantity * promoMultiplier);
        }

        // Round unit price
        unitPrice = +unitPrice.toFixed(2);

        const totalAmount = +(quantity * unitPrice).toFixed(2);

        if (quantity > 0) {
          batch.push({
            product_id: product.id,
            store_id: store.id,
            representative_id: store.representative_id,
            quantity,
            unit_price: unitPrice,
            total_amount: totalAmount,
            sale_date: dateStr,
          });

          if (batch.length >= BATCH_SIZE) {
            totalGenerated += batch.length;
            yield batch;
            batch = [];
          }
        }
      }
    }

    if (dayOffset % 30 === 0 && dayOffset > 0) {
      console.log(`  Day ${dayOffset}/${totalDays} (${totalGenerated.toLocaleString()} sales so far)...`);
    }
  }

  // Yield remaining
  if (batch.length > 0) {
    yield batch;
  }
}

import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/trino";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Current month sales
    const currentMonthQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM postgresql.public.sales
      WHERE sale_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND sale_date <= CURRENT_DATE
    `;

    // Previous month sales
    const previousMonthQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM postgresql.public.sales
      WHERE sale_date >= DATE_TRUNC('month', DATE_ADD('month', -1, CURRENT_DATE))
        AND sale_date < DATE_TRUNC('month', CURRENT_DATE)
    `;

    // Top 5 products this month
    const topProductsQuery = `
      SELECT p.name, SUM(s.total_amount) as revenue, SUM(s.quantity) as quantity
      FROM postgresql.public.sales s
      JOIN postgresql.public.products p ON s.product_id = p.id
      WHERE s.sale_date >= DATE_TRUNC('month', CURRENT_DATE)
        AND s.sale_date <= CURRENT_DATE
      GROUP BY p.name
      ORDER BY revenue DESC
      LIMIT 5
    `;

    // Sales by region this month
    const regionQuery = `
      SELECT st.region,
             SUM(s.total_amount) as revenue,
             SUM(s.total_amount) - LAG(SUM(s.total_amount)) OVER (
               PARTITION BY st.region ORDER BY DATE_TRUNC('month', s.sale_date)
             ) as change_amount
      FROM postgresql.public.sales s
      JOIN postgresql.public.stores st ON s.store_id = st.id
      WHERE s.sale_date >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '1' MONTH
        AND s.sale_date <= CURRENT_DATE
      GROUP BY st.region, DATE_TRUNC('month', s.sale_date)
      ORDER BY st.region
    `;

    // Monthly trend (last 12 months)
    const monthlyTrendQuery = `
      SELECT DATE_TRUNC('month', sale_date) as month,
             SUM(total_amount) as revenue
      FROM postgresql.public.sales
      WHERE sale_date >= DATE_ADD('month', -12, CURRENT_DATE)
      GROUP BY DATE_TRUNC('month', sale_date)
      ORDER BY month
    `;

    // Store count
    const storesQuery = `
      SELECT COUNT(*) as total FROM postgresql.public.stores
    `;

    // Average ticket this month
    const avgTicketQuery = `
      SELECT AVG(daily_total) as avg_ticket
      FROM (
        SELECT sale_date, SUM(total_amount) as daily_total
        FROM postgresql.public.sales
        WHERE sale_date >= DATE_TRUNC('month', CURRENT_DATE)
        GROUP BY sale_date
      ) daily
    `;

    const [currentResult, previousResult, topProducts, regionResult, monthlyTrend, storesResult, avgTicketResult] =
      await Promise.all([
        executeQuery(currentMonthQuery),
        executeQuery(previousMonthQuery),
        executeQuery(topProductsQuery),
        executeQuery(regionQuery),
        executeQuery(monthlyTrendQuery),
        executeQuery(storesQuery),
        executeQuery(avgTicketQuery),
      ]);

    const currentMonthSales = Number(currentResult.rows[0]?.revenue) || 0;
    const previousMonthSales = Number(previousResult.rows[0]?.revenue) || 0;
    const changePercent =
      previousMonthSales > 0
        ? ((currentMonthSales - previousMonthSales) / previousMonthSales) * 100
        : 0;

    // Process region data with change %
    const regionMap = new Map<string, { revenue: number; changePercent: number }>();
    const regions = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
    for (const r of regions) {
      regionMap.set(r, { revenue: 0, changePercent: 0 });
    }
    for (const row of regionResult.rows) {
      if (row.region) {
        regionMap.set(String(row.region), {
          revenue: Number(row.revenue) || 0,
          changePercent: Number(row.change_amount) || 0,
        });
      }
    }

    const salesByRegion = Array.from(regionMap.entries()).map(([region, data]) => ({
      region,
      revenue: data.revenue,
      changePercent: data.changePercent,
    }));

    const kpi = {
      currentMonthSales,
      previousMonthSales,
      changePercent: Math.round(changePercent * 10) / 10,
      topProducts: topProducts.rows.map((r) => ({
        name: String(r.name),
        revenue: Number(r.revenue) || 0,
        quantity: Number(r.quantity) || 0,
      })),
      salesByRegion,
      monthlyTrend: monthlyTrend.rows.map((r) => ({
        month: String(r.month).split("T")[0],
        revenue: Number(r.revenue) || 0,
      })),
      totalStores: Number(storesResult.rows[0]?.total) || 0,
      averageTicket: Number(avgTicketResult.rows[0]?.avg_ticket) || 0,
    };

    return NextResponse.json(kpi, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (err: any) {
    console.error("Dashboard API error:", err);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}

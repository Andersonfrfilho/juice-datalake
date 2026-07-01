import { NextResponse } from "next/server";
import { executeQuery } from "@/lib/trino";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    // Use the latest date in the data as reference (data is 2024-2025)
    const refDate = "DATE '2025-12-01'";

    const currentMonthQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM postgresql.public.sales
      WHERE sale_date >= DATE_TRUNC('month', ${refDate})
        AND sale_date <= ${refDate} + INTERVAL '1' MONTH - INTERVAL '1' DAY
    `;

    const previousMonthQuery = `
      SELECT COALESCE(SUM(total_amount), 0) as revenue
      FROM postgresql.public.sales
      WHERE sale_date >= DATE_TRUNC('month', DATE_ADD('month', -1, ${refDate}))
        AND sale_date < DATE_TRUNC('month', ${refDate})
    `;

    const topProductsQuery = `
      SELECT p.name, SUM(s.total_amount) as revenue, SUM(s.quantity) as quantity
      FROM postgresql.public.sales s
      JOIN postgresql.public.products p ON s.product_id = p.id
      WHERE s.sale_date >= DATE_TRUNC('month', ${refDate})
        AND s.sale_date <= ${refDate} + INTERVAL '1' MONTH - INTERVAL '1' DAY
      GROUP BY p.name
      ORDER BY revenue DESC
      LIMIT 5
    `;

    const regionQuery = `
      SELECT st.region,
             SUM(CASE WHEN s.sale_date >= DATE_TRUNC('month', DATE_ADD('month', -1, ${refDate}))
                       AND s.sale_date < DATE_TRUNC('month', ${refDate})
                      THEN s.total_amount ELSE 0 END) as revenue_prev,
             SUM(CASE WHEN s.sale_date >= DATE_TRUNC('month', ${refDate})
                       AND s.sale_date <= ${refDate} + INTERVAL '1' MONTH - INTERVAL '1' DAY
                      THEN s.total_amount ELSE 0 END) as revenue_curr
      FROM postgresql.public.sales s
      JOIN postgresql.public.stores st ON s.store_id = st.id
      GROUP BY st.region
      ORDER BY revenue_curr DESC
    `;

    const monthlyTrendQuery = `
      SELECT DATE_TRUNC('month', sale_date) as month,
             SUM(total_amount) as revenue
      FROM postgresql.public.sales
      WHERE sale_date >= DATE_ADD('month', -12, ${refDate})
        AND sale_date <= ${refDate} + INTERVAL '1' MONTH - INTERVAL '1' DAY
      GROUP BY DATE_TRUNC('month', sale_date)
      ORDER BY month
    `;

    const storesQuery = `
      SELECT COUNT(*) as total FROM postgresql.public.stores
    `;

    const avgTicketQuery = `
      SELECT AVG(daily_total) as avg_ticket
      FROM (
        SELECT sale_date, SUM(total_amount) as daily_total
        FROM postgresql.public.sales
        WHERE sale_date >= DATE_TRUNC('month', ${refDate})
          AND sale_date <= ${refDate} + INTERVAL '1' MONTH - INTERVAL '1' DAY
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

    const regions = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
    const regionMap = new Map<string, { revenue: number; changePercent: number }>();
    for (const r of regions) {
      regionMap.set(r, { revenue: 0, changePercent: 0 });
    }
    for (const row of regionResult.rows) {
      const reg = String(row.region);
      const curr = Number(row.revenue_curr) || 0;
      const prev = Number(row.revenue_prev) || 0;
      regionMap.set(reg, {
        revenue: curr,
        changePercent: prev > 0 ? ((curr - prev) / prev) * 100 : 0,
      });
    }

    const salesByRegion = Array.from(regionMap.entries()).map(([region, data]) => ({
      region,
      revenue: data.revenue,
      changePercent: Math.round(data.changePercent * 10) / 10,
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

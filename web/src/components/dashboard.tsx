"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Store,
  Receipt,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import * as RadixTooltip from "@radix-ui/react-tooltip";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { DashboardKPI } from "@/types";

const COLORS = ["#d4951e", "#f3dda3", "#935a16", "#ebc66a", "#653d1b"];
const REGION_COLORS: Record<string, string> = {
  Sudeste: "#d4951e",
  Nordeste: "#ebc66a",
  Sul: "#935a16",
  "Centro-Oeste": "#f3dda3",
  Norte: "#b87817",
};

export function Dashboard() {
  const [kpi, setKpi] = useState<DashboardKPI | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function fetchData() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/dashboard");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setKpi(data);
      setError(null);
    } catch {
      setError("Não foi possível carregar o dashboard. O data lake está rodando?");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3 text-zinc-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-sm">Carregando dashboard...</span>
        </div>
      </div>
    );
  }

  if (error || !kpi) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center max-w-md">
          <p className="text-zinc-400 mb-4">{error || "Dashboard indisponível"}</p>
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-2 text-sm bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg px-4 py-2 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const isPositive = kpi.changePercent >= 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-3 sm:p-4 space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Visão Geral</h2>
            <p className="text-sm text-zinc-400">Mês atual vs mês anterior</p>
          </div>
          <button
            onClick={fetchData}
            disabled={refreshing}
            className="flex items-center gap-2 text-xs text-zinc-400 hover:text-zinc-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
          <KpiCard
            icon={<DollarSign className="w-4 h-4" />}
            label="Vendas do Mês"
            value={formatCurrency(kpi.currentMonthSales)}
            change={kpi.changePercent}
            tooltip="Receita total gerada no mês de referência. Soma de todas as vendas (quantidade × preço unitário) no período."
          />
          <KpiCard
            icon={<Receipt className="w-4 h-4" />}
            label="Ticket Médio"
            value={formatCurrency(kpi.averageTicket)}
            change={kpi.changePercent}
            tooltip="Valor médio gasto por dia de venda. Calculado como receita total ÷ número de dias com vendas no mês. Indica o poder de compra dos clientes."
          />
          <KpiCard
            icon={<ShoppingCart className="w-4 h-4" />}
            label="Total Lojas"
            value={formatNumber(kpi.totalStores)}
            tooltip="Número total de lojas ativas na rede da distribuidora. Inclui supermercados, lojas de conveniência e atacados."
          />
          <KpiCard
            icon={<Store className="w-4 h-4" />}
            label="Regiões Ativas"
            value="5"
            tooltip="Cobertura geográfica: Norte, Nordeste, Centro-Oeste, Sudeste e Sul. Todas as 5 regiões do Brasil com operação ativa."
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Monthly Trend */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-zinc-300 mb-4">
              Tendência Mensal (12 meses)
            </h3>
            <div className="h-52 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={kpi.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      const d = new Date(v);
                      return `${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
                    }}
                  />
                  <YAxis
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      new Intl.NumberFormat("pt-BR", {
                        notation: "compact",
                        compactDisplay: "short",
                      }).format(v)
                    }
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                    labelFormatter={(label: string) => {
                      const d = new Date(label);
                      return d.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#d4951e"
                    strokeWidth={2}
                    dot={{ fill: "#d4951e", r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top Products */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-zinc-300 mb-4">
              Top 5 Produtos (este mês)
            </h3>
            <div className="h-52 sm:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={kpi.topProducts}
                  layout="vertical"
                  margin={{ left: 80 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis
                    type="number"
                    tick={{ fill: "#71717a", fontSize: 11 }}
                    tickFormatter={(v: number) =>
                      new Intl.NumberFormat("pt-BR", {
                        notation: "compact",
                        compactDisplay: "short",
                      }).format(v)
                    }
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fill: "#a1a1aa", fontSize: 11 }}
                    width={90}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                  />
                  <Bar dataKey="revenue" fill="#d4951e" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {/* Regional Breakdown */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-zinc-300 mb-4">
              Vendas por Região
            </h3>
            <div className="h-44 sm:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={kpi.salesByRegion}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="revenue"
                    nameKey="region"
                  >
                    {kpi.salesByRegion.map((entry, idx) => (
                      <Cell
                        key={entry.region}
                        fill={REGION_COLORS[entry.region] || COLORS[idx % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#18181b",
                      border: "1px solid #27272a",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                  />
                  <Legend
                    formatter={(value: string) => (
                      <span className="text-xs text-zinc-400">{value}</span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Regional Detail */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
            <h3 className="text-sm font-medium text-zinc-300 mb-4">
              Detalhamento Regional
            </h3>
            <div className="space-y-3">
              {kpi.salesByRegion.map((region) => (
                <div
                  key={region.region}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor:
                          REGION_COLORS[region.region] || "#71717a",
                      }}
                    />
                    <span className="text-sm text-zinc-300">{region.region}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">
                      {formatCurrency(region.revenue)}
                    </span>
                    <span
                      className={`text-xs ${
                        region.changePercent >= 0
                          ? "text-emerald-400"
                          : "text-red-400"
                      }`}
                    >
                      {region.changePercent >= 0 ? "+" : ""}
                      {region.changePercent.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  change,
  tooltip,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: number;
  tooltip?: string;
}) {
  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 sm:p-4 cursor-help hover:border-zinc-700 transition-colors">
            <div className="flex items-center justify-between mb-1.5 sm:mb-2">
              <span className="text-[11px] sm:text-xs text-zinc-400">{label}</span>
              <span className="text-zinc-500">{icon}</span>
            </div>
            <div className="text-base sm:text-lg font-semibold truncate">{value}</div>
            {change !== undefined && (
              <div className="flex items-center gap-1 mt-1">
                {change >= 0 ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-red-400" />
                )}
                <span
                  className={`text-xs ${change >= 0 ? "text-emerald-400" : "text-red-400"}`}
                >
                  {change >= 0 ? "+" : ""}
                  {change.toFixed(1)}% vs mês anterior
                </span>
              </div>
            )}
          </div>
        </RadixTooltip.Trigger>
        {tooltip && (
          <RadixTooltip.Portal>
            <RadixTooltip.Content
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs rounded-lg px-3 py-2 max-w-[220px] shadow-xl"
              sideOffset={5}
            >
              {tooltip}
              <RadixTooltip.Arrow className="fill-zinc-800" />
            </RadixTooltip.Content>
          </RadixTooltip.Portal>
        )}
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

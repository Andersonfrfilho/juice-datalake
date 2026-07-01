export interface Product {
  id: number;
  name: string;
  category: string;
  flavor: string;
  size_ml: number;
  cost_price: number;
  sell_price: number;
}

export interface Store {
  id: number;
  name: string;
  city: string;
  state: string;
  region: string;
  type: string;
  opened_at: string;
}

export interface Sale {
  product_id: number;
  store_id: number;
  quantity: number;
  unit_price: number;
  total_amount: number;
  sale_date: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  sql?: string;
  data?: Record<string, unknown>[];
}

export interface DashboardKPI {
  currentMonthSales: number;
  previousMonthSales: number;
  changePercent: number;
  topProducts: { name: string; revenue: number; quantity: number }[];
  salesByRegion: { region: string; revenue: number; changePercent: number }[];
  monthlyTrend: { month: string; revenue: number }[];
  totalStores: number;
  averageTicket: number;
}

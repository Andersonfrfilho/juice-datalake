export interface QuestionTemplate {
  id: string;
  category: string;
  patterns: string[];
  parameters: TemplateParameter[];
  sql: string;
  description: string;
  example: string;
}

export interface TemplateParameter {
  name: string;
  type: "region" | "category" | "period" | "metric" | "number" | "enum";
  values?: string[];
  default: string;
}

// ═══════════════════════════════════════════════
// 18 templates cobrindo 15 perguntas de negócio
// ═══════════════════════════════════════════════

export const questionTemplates: QuestionTemplate[] = [
  // ═══ 1. TOP PRODUTO ═══
  {
    id: "top-product",
    category: "Produtos",
    patterns: [
      "qual (o )?suco (mais )?(vendeu|vendido|vende|fatura|faturou)",
      "qual (o )?produto (mais )?(vendeu|vendido|vende|fatura|faturou)",
      "suco campe[aã]o",
      "(top|ranking|melhores) (produtos|sucos)",
      "produtos? (mais|que mais) (vende|venderam|faturaram)",
      "quais (os )?sucos mais venderam",
      "o que (mais )?(vende|sai|fatura)",
      "l[ií]der(es)? (de )?vendas?",
    ],
    parameters: [
      { name: "metric", type: "enum", values: ["receita", "volume"], default: "receita" },
      { name: "period", type: "period", default: "last_3_months" },
      { name: "region", type: "region", default: "todas" },
      { name: "category", type: "category", default: "todas" },
      { name: "limit", type: "number", default: "5" },
    ],
    sql: `SELECT p.name as produto, p.category as categoria, SUM(s.total_amount) as receita, SUM(s.quantity) as volume
FROM postgresql.public.sales s
JOIN postgresql.public.products p ON s.product_id = p.id
JOIN postgresql.public.stores st ON s.store_id = st.id
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
  {region_filter} {category_filter}
GROUP BY p.name, p.category
ORDER BY {order_by} DESC
LIMIT {limit}`,
    description: "Top produtos por receita ou volume",
    example: "Qual suco mais vendeu no Sudeste no último trimestre?",
  },

  // ═══ 2. PIOR PRODUTO ═══
  {
    id: "worst-product",
    category: "Produtos",
    patterns: [
      "piores? (produtos|sucos)",
      "qual (o )?(produto|suco) (menos|pior|que menos) (vende|vendeu|vendido)",
      "produtos? com (baixo|pior|menor) (desempenho|performance|venda)",
      "sucos? (que|com) (baixa|pouca|menor) (venda|sa[ií]da|performance)",
      "o que (menos )?(vende|sai)",
      "desempenho ruim",
      "(baixo|pouco) (giro|fat?uramento)",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
      { name: "region", type: "region", default: "todas" },
      { name: "limit", type: "number", default: "5" },
    ],
    sql: `SELECT p.name as produto, p.category as categoria, SUM(s.total_amount) as receita, SUM(s.quantity) as volume
FROM postgresql.public.sales s
JOIN postgresql.public.products p ON s.product_id = p.id
JOIN postgresql.public.stores st ON s.store_id = st.id
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
  {region_filter}
GROUP BY p.name, p.category
HAVING SUM(s.total_amount) > 0
ORDER BY receita ASC
LIMIT {limit}`,
    description: "Produtos com pior desempenho em vendas",
    example: "Quais os piores sucos em venda no último trimestre?",
  },

  // ═══ 3. CRESCIMENTO CATEGORIA ═══
  {
    id: "growing-category",
    category: "Tendências",
    patterns: [
      "qual (a )?categoria (mais )?cresce",
      "qual (o )?sabor (mais )?cresce",
      "categoria (com|de) (maior|mais) cresc",
      "o que (mais|menos) cresce",
      "tendência de cresc",
      "crescimento por categoria",
      "qual categoria (esta|est[aá]|vem) (crescendo|subindo|ganhando)",
      "evolu[cç][aã]o por categoria",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_6_months" },
    ],
    sql: `WITH curr AS (
  SELECT p.category, SUM(s.total_amount) as revenue
  FROM postgresql.public.sales s JOIN postgresql.public.products p ON s.product_id = p.id
  WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
  GROUP BY p.category
), prev AS (
  SELECT p.category, SUM(s.total_amount) as revenue
  FROM postgresql.public.sales s JOIN postgresql.public.products p ON s.product_id = p.id
  WHERE s.sale_date >= {prev_period_start} AND s.sale_date < {period_start}
  GROUP BY p.category
)
SELECT c.category, ROUND(((c.revenue - p.revenue)/NULLIF(p.revenue,0)*100),1) as crescimento_pct,
  ROUND(c.revenue,2) as receita_atual, ROUND(p.revenue,2) as receita_anterior
FROM curr c JOIN prev p ON c.category = p.category
WHERE p.revenue > 0 ORDER BY crescimento_pct DESC`,
    description: "Categorias com maior crescimento percentual",
    example: "Qual categoria mais cresceu nos últimos 6 meses?",
  },

  // ═══ 4. REGIÕES ═══
  {
    id: "top-region",
    category: "Regiões",
    patterns: [
      "qual (a )?regi[aã]o (mais )?(vendeu|performa|fatura|faturou)",
      "regi[aã]o com (maior|melhor)",
      "melhor regi[aã]o",
      "vendas? por regi[aã]o",
      "comparar regi[oõ]es",
      "desempenho regional",
      "ranking (de |por )?regi",
      "onde (mais )?(vende|fatura)",
    ],
    parameters: [
      { name: "period", type: "period", default: "current_month" },
      { name: "metric", type: "enum", values: ["receita", "volume", "crescimento"], default: "receita" },
    ],
    sql: `SELECT st.region as regiao, SUM(s.total_amount) as receita, SUM(s.quantity) as volume,
  ROUND(AVG(s.total_amount),2) as ticket_medio, COUNT(DISTINCT s.store_id) as lojas_ativas
FROM postgresql.public.sales s
JOIN postgresql.public.stores st ON s.store_id = st.id
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
GROUP BY st.region
ORDER BY {order_by} DESC`,
    description: "Ranking de regiões por receita ou volume",
    example: "Qual região vendeu mais este mês?",
  },

  // ═══ 5. TIPOS DE LOJA ═══
  {
    id: "store-type-compare",
    category: "Operações",
    patterns: [
      "tipo(s)? de loja",
      "comparar (tipo|formato|canal)",
      "supermercado (vs|x|versus|comparado) (conveni|atacado)",
      "qual (tipo|formato|canal) (de )?loja (mais )?(vende|performa|fatura)",
      "melhor (tipo|formato) de loja",
      "lojas por (tipo|categoria)",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
      { name: "metric", type: "enum", values: ["receita", "volume", "ticket_medio"], default: "receita" },
    ],
    sql: `SELECT st.type as tipo, COUNT(DISTINCT st.id) as qtd_lojas,
  SUM(s.total_amount) as receita, SUM(s.quantity) as volume,
  ROUND((SUM(s.total_amount)/NULLIF(COUNT(DISTINCT st.id),0)),2) as receita_por_loja,
  ROUND(AVG(s.total_amount),2) as ticket_medio
FROM postgresql.public.sales s
JOIN postgresql.public.stores st ON s.store_id = st.id
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
GROUP BY st.type
ORDER BY {order_by} DESC`,
    description: "Comparação entre tipos de loja",
    example: "Qual tipo de loja tem maior ticket médio?",
  },

  // ═══ 6. SAZONALIDADE ═══
  {
    id: "seasonality",
    category: "Sazonalidade",
    patterns: [
      "sazonalidade",
      "padr[aã]o (de |das )?vendas?",
      "qual (a |o )?[eé]poca (que |em que )?(mais |menos )?vende",
      "pico de venda",
      "(meses|per[ií]odo) (com |de |que )?(mais |menos )?(venda|sa[ií]da)",
      "tendência mensal",
      "vendas? (por |ao longo do |no )(m[eê]s|ano)",
      "esta[cç][aã]o (do ano )?(que |com )?(mais |menos )?vende",
      "ver[aã]o (vs|x|versus|comparado) inverno",
      "comportamento (das |de )?vendas?",
    ],
    parameters: [
      { name: "category", type: "category", default: "todas" },
      { name: "period", type: "period", default: "last_12_months" },
    ],
    sql: `SELECT EXTRACT(MONTH FROM s.sale_date) as mes_num,
  DATE_TRUNC('month', s.sale_date) as mes,
  SUM(s.total_amount) as receita, SUM(s.quantity) as volume,
  AVG(s.unit_price) as preco_medio
FROM postgresql.public.sales s
JOIN postgresql.public.products p ON s.product_id = p.id
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
  {category_filter}
GROUP BY DATE_TRUNC('month', s.sale_date), EXTRACT(MONTH FROM s.sale_date)
ORDER BY mes`,
    description: "Sazonalidade de vendas por mês",
    example: "Qual a sazonalidade de sucos cítricos no último ano?",
  },

  // ═══ 7. LOJAS UNDERPERFORMING ═══
  {
    id: "underperforming-stores",
    category: "Operações",
    patterns: [
      "lojas? (com |que |abaixo|underperform)",
      "(piores?|abaixo|underperform) lojas?",
      "lojas? (com |de )?(baixo|ruim|pior) (desempenho|performance|resultado|venda)",
      "quais? lojas? (venderam|performaram|foram) (mal|pior|abaixo)",
      "lojas? que (precisam|necessitam) (de |melhorar|aten[cç][aã]o)",
      "onde (est[aá]|as vendas) (ruim|fraco|abaixo)",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_month" },
      { name: "region", type: "region", default: "todas" },
      { name: "threshold", type: "number", default: "0" },
    ],
    sql: `WITH store_sales AS (
  SELECT st.name, st.city, st.region, st.type, SUM(s.total_amount) as revenue
  FROM postgresql.public.sales s
  JOIN postgresql.public.stores st ON s.store_id = st.id
  WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
  GROUP BY st.name, st.city, st.region, st.type
), regional_avg AS (
  SELECT region, AVG(revenue) as avg_revenue FROM store_sales GROUP BY region
)
SELECT ss.name as loja, ss.city as cidade, ss.region as regiao, ss.type as tipo,
  ROUND(CAST(ss.revenue AS DECIMAL),2) as receita,
  ROUND(CAST(ra.avg_revenue AS DECIMAL),2) as media_regional,
  ROUND(CAST(((ss.revenue-ra.avg_revenue)/NULLIF(ra.avg_revenue,0)*100) AS DECIMAL),1) as gap_pct
FROM store_sales ss JOIN regional_avg ra ON ss.region = ra.region
WHERE ss.revenue < ra.avg_revenue * (1 - {threshold}/100.0)
  AND (ss.region = '{region}' OR '{region}' = 'todas')
ORDER BY gap_pct ASC LIMIT 10`,
    description: "Lojas com vendas abaixo da média regional",
    example: "Quais lojas do Sudeste venderam 30% abaixo da média?",
  },

  // ═══ 8. GIRO DE PRODUTO ═══
  {
    id: "product-turnover",
    category: "Operações",
    patterns: [
      "giro (de |do |por )?(produto|estoque)",
      "rotatividade",
      "frequência de (venda|compra|sa[ií]da)",
      "qual (a )?média (de |de vendas |di[aá]ria )?(por |do )?(produto|loja)",
      "quantas? unidades? (por dia|di[aá]ria|em m[eé]dia)",
      "velocidade de venda",
      "vendas? (m[eé]dias?|di[aá]rias?) (por |do )?produto",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
      { name: "limit", type: "number", default: "10" },
    ],
    sql: `SELECT p.name as produto, p.category as categoria,
  ROUND(SUM(s.quantity),0) as volume_total,
  ROUND((SUM(s.quantity)/NULLIF(COUNT(DISTINCT s.sale_date),0)),1) as media_diaria,
  COUNT(DISTINCT s.store_id) as lojas_ativas,
  ROUND((SUM(s.quantity)/NULLIF(COUNT(DISTINCT s.store_id),0)),1) as media_por_loja
FROM postgresql.public.sales s
JOIN postgresql.public.products p ON s.product_id = p.id
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
GROUP BY p.name, p.category
ORDER BY media_diaria DESC
LIMIT {limit}`,
    description: "Giro médio diário de cada produto",
    example: "Qual o giro médio diário de cada sabor por loja?",
  },

  // ═══ 9. MARGENS ═══
  {
    id: "margins",
    category: "Financeiro",
    patterns: [
      "margem",
      "lucro",
      "rent[aá]vel",
      "rentabilidade",
      "(qual |quais? )(a |as? )?(categoria|produto|suco) (mais |com maior |com melhor )?(lucrativa|rent[aá]vel|margem)",
      "custo benef",
      "vale (mais |a pena)",
      "qual (d[aá]|traz|retorna) mais (lucro|retorno|margem)",
      "melhor investimento",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
      { name: "category", type: "category", default: "todas" },
    ],
    sql: `SELECT p.category as categoria,
  ROUND(AVG(s.unit_price-p.cost_price),2) as margem_brl,
  ROUND((AVG(s.unit_price-p.cost_price)/AVG(s.unit_price)*100),1) as margem_pct,
  SUM(s.total_amount) as receita,
  SUM(s.quantity) as volume
FROM postgresql.public.sales s
JOIN postgresql.public.products p ON s.product_id = p.id
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
  {category_filter}
GROUP BY p.category
ORDER BY margem_pct DESC`,
    description: "Margem bruta por categoria",
    example: "Qual categoria de suco tem melhor margem?",
  },

  // ═══ 10. PREVISÃO ═══
  {
    id: "forecast",
    category: "Previsão",
    patterns: [
      "previs[aã]o",
      "proje[cç][aã]o",
      "expectativa",
      "(vai|vão|ir[aá]) vender",
      "pr[oó]ximos? (meses|m[eê]s)",
      "tendência (futura|para|daqui)",
      "(em |no )?que (investir|apostar|focar)",
      "qual (a )?perspectiva",
      "como (vai |ser[aá] |estar[aá] )?(daqui|no futuro|nos pr[oó]ximos)",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_6_months" },
      { name: "horizon", type: "number", default: "3" },
    ],
    sql: `WITH monthly AS (
  SELECT DATE_TRUNC('month', s.sale_date) as mes, SUM(s.total_amount) as receita
  FROM postgresql.public.sales s
  WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
  GROUP BY 1
), trend AS (
  SELECT REGR_SLOPE(receita, TO_UNIXTIME(mes)) as slope, AVG(receita) as avg_rev FROM monthly
), last_m AS (
  SELECT receita FROM monthly ORDER BY mes DESC LIMIT 1
)
SELECT ROUND(CAST(lm.receita AS DECIMAL),2) as receita_ultimo_mes,
  ROUND(CAST((lm.receita + t.slope*30*86400) AS DECIMAL),2) as projecao_mes1,
  ROUND(CAST((lm.receita + t.slope*60*86400) AS DECIMAL),2) as projecao_mes2,
  ROUND(CAST((lm.receita + t.slope*90*86400) AS DECIMAL),2) as projecao_mes3,
  CASE WHEN t.slope > 0 THEN 'Crescimento' ELSE 'Queda' END as direcao
FROM last_m lm, trend t`,
    description: "Previsão de vendas usando regressão linear",
    example: "Qual a previsão de vendas para os próximos 3 meses?",
  },

  // ═══ 11. TICKET MÉDIO ═══
  {
    id: "avg-ticket",
    category: "Financeiro",
    patterns: [
      "ticket m[eé]dio",
      "valor m[eé]dio",
      "gasto m[eé]dio",
      "compra m[eé]dia",
      "quanto (gasta|compra|custa) (em |por )?m[eé]dia",
      "perfil de (compra|consumo)",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
      { name: "region", type: "region", default: "todas" },
    ],
    sql: `SELECT st.region as regiao,
  ROUND(AVG(daily.revenue),2) as receita_media_diaria,
  ROUND((SUM(daily.revenue)/NULLIF(SUM(daily.transactions),0)),2) as ticket_medio,
  SUM(daily.revenue) as receita_total,
  SUM(daily.transactions) as total_transacoes
FROM (
  SELECT s.store_id, s.sale_date, SUM(s.total_amount) as revenue, COUNT(*) as transactions
  FROM postgresql.public.sales s
  JOIN postgresql.public.stores st2 ON s.store_id = st2.id
  WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE {region_filter}
  GROUP BY s.store_id, s.sale_date
) daily
JOIN postgresql.public.stores st ON daily.store_id = st.id
GROUP BY st.region
ORDER BY ticket_medio DESC`,
    description: "Ticket médio por região",
    example: "Qual o ticket médio por região no último trimestre?",
  },

  // ═══ 12. COMPARAÇÃO MENSAL ═══
  {
    id: "monthly-comparison",
    category: "Tendências",
    patterns: [
      "comparar (meses|m[eê]s)",
      "m[eê]s (anterior|passado|atual)",
      "m[eê]s a m[eê]s",
      "evolu[cç][aã]o mensal",
      "como (foi|estava|est[aá]) (o |no )?m[eê]s",
      "diferen[cç]a (entre |do )?m[eê]s",
      "vs m[eê]s",
      "versus m[eê]s",
      "melhorou (ou |e )?piorou",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
    ],
    sql: `SELECT DATE_TRUNC('month', s.sale_date) as mes,
  SUM(s.total_amount) as receita,
  SUM(s.quantity) as volume,
  COUNT(*) as transacoes,
  ROUND(AVG(s.total_amount),2) as ticket_medio
FROM postgresql.public.sales s
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
GROUP BY DATE_TRUNC('month', s.sale_date)
ORDER BY mes DESC`,
    description: "Comparação de vendas mês a mês",
    example: "Como foram as vendas mês a mês no último trimestre?",
  },

  // ═══ 13. PARTICIPAÇÃO (%) ═══
  {
    id: "market-share",
    category: "Produtos",
    patterns: [
      "participa[cç][aã]o",
      "market share",
      "quanto representa",
      "fatia (de |do )?mercado",
      "percentual (de |do )?total",
      "% (da |das |do )?(receita|venda)",
      "representatividade",
      "qual (a )?propor[cç][aã]o",
      "quanto (cada|o) (produto|categoria) (representa|contribui)",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
      { name: "category", type: "category", default: "todas" },
    ],
    sql: `WITH total AS (SELECT SUM(total_amount) as t FROM postgresql.public.sales s
  JOIN postgresql.public.products p ON s.product_id = p.id
  WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE {category_filter})
SELECT p.name as produto, p.category as categoria,
  ROUND(SUM(s.total_amount),2) as receita,
  ROUND((SUM(s.total_amount)/(SELECT t FROM total)*100),1) as participacao_pct
FROM postgresql.public.sales s
JOIN postgresql.public.products p ON s.product_id = p.id
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE {category_filter}
GROUP BY p.name, p.category
HAVING SUM(s.total_amount) > 0
ORDER BY participacao_pct DESC
LIMIT 10`,
    description: "Participação percentual de cada produto na receita total",
    example: "Qual a participação de cada sabor na receita total?",
  },

  // ═══ 14. VISÃO GERAL ═══
  {
    id: "overview",
    category: "Geral",
    patterns: [
      "vis[aã]o geral",
      "resumo",
      "overview",
      "como (est[aã]o|est[aá]|andam) (as |os )?(vendas?|resultados?|n[uú]meros?)",
      "panorama",
      "status",
      "dashboard",
      "big numbers",
      "de relance",
      "o que (est[aá]|acontece)",
    ],
    parameters: [
      { name: "period", type: "period", default: "current_month" },
    ],
    sql: `SELECT
  (SELECT ROUND(SUM(total_amount),2) FROM postgresql.public.sales WHERE sale_date >= {period_start} AND sale_date <= CURRENT_DATE) as receita,
  (SELECT COUNT(*) FROM postgresql.public.sales WHERE sale_date >= {period_start} AND sale_date <= CURRENT_DATE) as transacoes,
  (SELECT ROUND(AVG(total_amount),2) FROM postgresql.public.sales WHERE sale_date >= {period_start} AND sale_date <= CURRENT_DATE) as ticket_medio,
  (SELECT COUNT(DISTINCT product_id) FROM postgresql.public.sales WHERE sale_date >= {period_start} AND sale_date <= CURRENT_DATE) as produtos_ativos,
  (SELECT COUNT(DISTINCT store_id) FROM postgresql.public.sales WHERE sale_date >= {period_start} AND sale_date <= CURRENT_DATE) as lojas_ativas,
  (SELECT ROUND(AVG(unit_price),2) FROM postgresql.public.sales WHERE sale_date >= {period_start} AND sale_date <= CURRENT_DATE) as preco_medio`,
    description: "Visão geral de vendas no período",
    example: "Como estão as vendas este mês?",
  },

  // ═══ 15. PREÇO VS VOLUME ═══
  {
    id: "price-volume",
    category: "Financeiro",
    patterns: [
      "pre[cç]o (vs|x|versus|comparado|e|impacta) (volume|quantidade|demanda)",
      "elasticidade",
      "quando (o )?pre[cç]o (sobe|desce|aumenta|diminui|cai|varia)",
      "impacto (do |no )?pre[cç]o",
      "rela[cç][aã]o pre[cç]o",
      "pre[cç]o influencia",
      "se (aumentar|diminuir|mudar) (o )?pre[cç]o",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_12_months" },
    ],
    sql: `SELECT p.name as produto, p.category as categoria,
  ROUND(AVG(s.unit_price),2) as preco_medio,
  ROUND(SUM(s.quantity),0) as volume_total,
  ROUND(SUM(s.total_amount),2) as receita_total,
  ROUND((STDDEV(s.unit_price)/NULLIF(AVG(s.unit_price),0)*100),1) as volatilidade_preco,
  COUNT(*) as transacoes
FROM postgresql.public.sales s
JOIN postgresql.public.products p ON s.product_id = p.id
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
GROUP BY p.name, p.category
HAVING COUNT(*) > 100
ORDER BY volatilidade_preco DESC
LIMIT 10`,
    description: "Relação entre preço e volume vendido",
    example: "Quando o preço variou, como o volume respondeu?",
  },

  // ═══ 16. YOY COMPARAÇÃO ANUAL ═══
  {
    id: "year-over-year",
    category: "Tendências",
    patterns: [
      "ano (a |contra |versus |vs |x |comparado )?(ano|anterior|passado)",
      "yoy|year.over.year",
      "crescimento anual",
      "comparar (2024|2025|anos)",
      "evolu[cç][aã]o anual",
      "(2024|2025) (vs|x|comparado|versus)",
      "de um ano (para|pro) outro",
    ],
    parameters: [
      { name: "metric", type: "enum", values: ["receita", "volume"], default: "receita" },
    ],
    sql: `SELECT p.category as categoria,
  SUM(CASE WHEN s.sale_date BETWEEN DATE '2024-01-01' AND DATE '2024-12-31' THEN s.total_amount ELSE 0 END) as receita_2024,
  SUM(CASE WHEN s.sale_date BETWEEN DATE '2025-01-01' AND DATE '2025-12-31' THEN s.total_amount ELSE 0 END) as receita_2025,
  ROUND(((SUM(CASE WHEN s.sale_date BETWEEN DATE '2025-01-01' AND DATE '2025-12-31' THEN s.total_amount ELSE 0 END) -
          SUM(CASE WHEN s.sale_date BETWEEN DATE '2024-01-01' AND DATE '2024-12-31' THEN s.total_amount ELSE 0 END)) /
          NULLIF(SUM(CASE WHEN s.sale_date BETWEEN DATE '2024-01-01' AND DATE '2024-12-31' THEN s.total_amount ELSE 0 END),0)*100),1) as crescimento_pct
FROM postgresql.public.sales s
JOIN postgresql.public.products p ON s.product_id = p.id
GROUP BY p.category
ORDER BY crescimento_pct DESC`,
    description: "Comparação ano contra ano (2024 vs 2025)",
    example: "Qual categoria mais cresceu em 2025 comparado com 2024?",
  },

  // ═══ 17. PRODUTOS POR LOJA ═══
  {
    id: "products-per-store",
    category: "Operações",
    patterns: [
      "quais? produtos? (por |em cada |na |da )?loja",
      "sortimento",
      "mix de produtos?",
      "variedade (por |na |da )?loja",
      "quantos? (produtos|sabores|itens) (por |em cada |na )?loja",
      "portfolio por loja",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_month" },
      { name: "region", type: "region", default: "todas" },
      { name: "limit", type: "number", default: "10" },
    ],
    sql: `SELECT st.name as loja, st.city as cidade, st.region as regiao,
  COUNT(DISTINCT s.product_id) as produtos_diferentes,
  SUM(s.total_amount) as receita,
  SUM(s.quantity) as volume
FROM postgresql.public.sales s
JOIN postgresql.public.stores st ON s.store_id = st.id
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
  {region_filter}
GROUP BY st.name, st.city, st.region
ORDER BY receita DESC
LIMIT {limit}`,
    description: "Mix de produtos vendidos por loja",
    example: "Quantos produtos diferentes cada loja vendeu?",
  },

  // ═══ 18. PREÇO MÉDIO ═══
  {
    id: "avg-price",
    category: "Financeiro",
    patterns: [
      "pre[cç]o m[eé]dio",
      "quanto custa em m[eé]dia",
      "valor (m[eé]dio|praticado)",
      "faixa de pre[cç]o",
      "pre[cç]o (por |da |do )?(regi[aã]o|categoria|produto)",
      "qual (o )?pre[cç]o",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
      { name: "region", type: "region", default: "todas" },
    ],
    sql: `SELECT p.category as categoria,
  ROUND(AVG(s.unit_price),2) as preco_medio,
  ROUND(MIN(s.unit_price),2) as preco_minimo,
  ROUND(MAX(s.unit_price),2) as preco_maximo,
  SUM(s.quantity) as volume
FROM postgresql.public.sales s
JOIN postgresql.public.products p ON s.product_id = p.id
JOIN postgresql.public.stores st ON s.store_id = st.id
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
  {region_filter}
GROUP BY p.category
ORDER BY preco_medio DESC`,
    description: "Preço médio praticado por categoria",
    example: "Qual o preço médio do suco de laranja?",
  },

  // ═══ 19. TOP REPRESENTANTES ═══
  {
    id: "top-representatives",
    category: "Representantes",
    patterns: [
      "(qual|quais?) (o |os? )?(representante|vendedor|consultor|rep) (mais |melhor |de maior |que mais )?(vendeu|performa|fatura)",
      "ranking (de |dos )?(representantes|vendedores|reps)",
      "melhores? (representantes|vendedores|reps)",
      "top (representantes|vendedores|reps)",
      "quem (mais )?(vendeu|faturou)",
      "performance (do |dos |de )?(representante|vendedor|time)",
      "melhor vendedor",
      "time de vendas",
      "equipe (de |comercial|de vendas)",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
      { name: "region", type: "region", default: "todas" },
      { name: "limit", type: "number", default: "10" },
    ],
    sql: `SELECT r.name as representante, r.region as regiao,
  COUNT(DISTINCT st.id) as lojas,
  SUM(s.total_amount) as receita,
  SUM(s.quantity) as volume,
  ROUND(AVG(s.total_amount),2) as ticket_medio
FROM postgresql.public.sales s
JOIN postgresql.public.stores st ON s.store_id = st.id
JOIN postgresql.public.representatives r ON st.representative_id = r.id
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
  {region_filter}
GROUP BY r.name, r.region
ORDER BY receita DESC
LIMIT {limit}`,
    description: "Ranking de representantes por receita",
    example: "Qual representante mais vendeu no último trimestre?",
  },

  // ═══ 20. PIORES REPRESENTANTES ═══
  {
    id: "worst-representatives",
    category: "Representantes",
    patterns: [
      "piores? (representantes|vendedores|reps)",
      "(representante|vendedor|rep) (com |de |que )?(pior|menor|mais baix[ao]) (desempenho|performance|venda|resultado)",
      "quem (menos |pior )?(vendeu|faturou|performa)",
      "representantes? abaixo (da |de )?m[eé]dia",
      "vendedores? (com|que) (precisam|necessitam) (melhorar|de ajuda|de aten)",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
      { name: "region", type: "region", default: "todas" },
      { name: "limit", type: "number", default: "5" },
    ],
    sql: `WITH rep_sales AS (
  SELECT r.name, r.region, SUM(s.total_amount) as revenue, COUNT(DISTINCT st.id) as stores
  FROM postgresql.public.sales s
  JOIN postgresql.public.stores st ON s.store_id = st.id
  JOIN postgresql.public.representatives r ON st.representative_id = r.id
  WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE {region_filter}
  GROUP BY r.name, r.region
), reg_avg AS (
  SELECT region, AVG(revenue) as avg_rev FROM rep_sales GROUP BY region
)
SELECT rs.name as representante, rs.region as regiao, rs.stores as lojas,
  ROUND(rs.revenue,2) as receita,
  ROUND(ra.avg_rev,2) as media_regional,
  ROUND(((rs.revenue-ra.avg_rev)/NULLIF(ra.avg_rev,0)*100),1) as gap_pct
FROM rep_sales rs JOIN reg_avg ra ON rs.region = ra.region
WHERE rs.revenue < ra.avg_rev
ORDER BY gap_pct ASC LIMIT {limit}`,
    description: "Representantes abaixo da média regional",
    example: "Quais representantes estão abaixo da média?",
  },

  // ═══ 21. REPRESENTANTES POR REGIÃO ═══
  {
    id: "representatives-by-region",
    category: "Representantes",
    patterns: [
      "representantes? (por |da |do |de )?regi",
      "quantos? (representantes|vendedores|reps) (por |em cada |na |tem a )?regi",
      "distribui[cç][aã]o (de |dos )?(representantes|vendedores|reps)",
      "equipe (por |da )?regi",
      "for[cç]a de vendas",
      "estrutura comercial",
    ],
    parameters: [],
    sql: `SELECT r.region as regiao,
  COUNT(DISTINCT r.id) as representantes,
  COUNT(DISTINCT st.id) as lojas,
  ROUND(AVG(r.performance_score),1) as score_medio,
  COALESCE(SUM(s.total_amount),0) as receita_3m
FROM postgresql.public.representatives r
LEFT JOIN postgresql.public.stores st ON r.id = st.representative_id
LEFT JOIN postgresql.public.sales s ON st.id = s.store_id
  AND s.sale_date >= DATE_ADD('month', -3, CURRENT_DATE)
WHERE r.is_active = true
GROUP BY r.region
ORDER BY receita_3m DESC`,
    description: "Distribuição de representantes por região",
    example: "Quantos representantes por região?",
  },

  // ═══ 22. DEVOLUÇÕES ═══
  {
    id: "returns-analysis",
    category: "Devoluções",
    patterns: [
      "devolu[cç][aã]o",
      "retorno",
      "cancelamento",
      "(produto|item) (devolvido|retornado|cancelado)",
      "taxa de devolu[cç][aã]o",
      "qual (o |a )?(produto|categoria|representante|motivo) (com )?mais devolu",
      "indice de devolu",
      "quem (tem|teve) mais devolu",
      "oque (mais )?(volta|retorna|devolve)",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
      { name: "limit", type: "number", default: "10" },
    ],
    sql: `WITH sold AS (
  SELECT product_id, SUM(quantity) as qtd_vendida
  FROM postgresql.public.sales
  WHERE sale_date >= {period_start} AND sale_date <= CURRENT_DATE
  GROUP BY product_id
)
SELECT p.name as produto, p.category as categoria,
  SUM(r.quantity) as qtd_devolvida,
  COUNT(*) as ocorrencias,
  SUM(r.total_amount) as valor_devolvido,
  ROUND((SUM(r.quantity)/NULLIF(MAX(sold.qtd_vendida),0)*100),1) as taxa_devolucao_pct
FROM postgresql.public.returns r
JOIN postgresql.public.products p ON r.product_id = p.id
LEFT JOIN sold ON sold.product_id = r.product_id
WHERE r.return_date >= {period_start} AND r.return_date <= CURRENT_DATE
GROUP BY p.name, p.category
ORDER BY taxa_devolucao_pct DESC
LIMIT {limit}`,
    description: "Análise de devoluções por produto",
    example: "Qual produto tem mais devoluções?",
  },

  // ═══ 23. DEVOLUÇÕES POR REPRESENTANTE ═══
  {
    id: "returns-by-rep",
    category: "Devoluções",
    patterns: [
      "devolu[cç][aã]o (por |do |de )?(representante|vendedor|rep)",
      "(representante|vendedor|rep) (com |de )?mais devolu",
      "quem (tem|teve) (mais|maior) (devolu|retorno|cancelamento)",
      "ranking (de )?devolu[cç]",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
      { name: "limit", type: "number", default: "10" },
    ],
    sql: `SELECT r.name as representante, r.region as regiao,
  SUM(ret.quantity) as qtd_devolvida,
  COUNT(*) as ocorrencias,
  SUM(ret.total_amount) as valor_devolvido,
  SUM(s.total_amount) as receita_total,
  ROUND((SUM(ret.total_amount)/NULLIF(SUM(s.total_amount),0)*100),1) as taxa_devolucao_pct
FROM postgresql.public.returns ret
JOIN postgresql.public.representatives r ON ret.representative_id = r.id
JOIN postgresql.public.sales s ON s.representative_id = r.id
  AND s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
WHERE ret.return_date >= {period_start} AND ret.return_date <= CURRENT_DATE
GROUP BY r.name, r.region
ORDER BY taxa_devolucao_pct DESC
LIMIT {limit}`,
    description: "Representantes com maior taxa de devolução",
    example: "Qual representante tem mais devoluções?",
  },

  // ═══ 24. MOTIVOS DE DEVOLUÇÃO ═══
  {
    id: "return-reasons",
    category: "Devoluções",
    patterns: [
      "motivo(s)? (de |da |das )?devolu[cç]",
      "por que (devolvem|retornam|cancelam)",
      "causa(s)? (de |da )?devolu[cç]",
      "razao (de |da )?devolu",
      "qual (o )?motivo",
      "porque (os |os produtos |)s[aã]o devolvidos",
      "breakdown (de |das )?devolu",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_6_months" },
    ],
    sql: `SELECT r.reason as motivo,
  COUNT(*) as ocorrencias,
  SUM(r.quantity) as qtd_devolvida,
  SUM(r.total_amount) as valor_devolvido,
  ROUND((COUNT(*)/NULLIF((SELECT COUNT(*) FROM postgresql.public.returns
    WHERE return_date >= {period_start} AND return_date <= CURRENT_DATE),0)*100),1) as participacao_pct
FROM postgresql.public.returns r
WHERE r.return_date >= {period_start} AND r.return_date <= CURRENT_DATE
GROUP BY r.reason
ORDER BY ocorrencias DESC`,
    description: "Distribuição de motivos de devolução",
    example: "Quais os principais motivos de devolução?",
  },

  // ═══ 25. PERFORMANCE REPRESENTANTE (COMPLETO) ═══
  {
    id: "rep-performance-full",
    category: "Representantes",
    patterns: [
      "performance completa",
      "score (do |dos |de )?(representante|vendedor|rep)",
      "avalia[cç][aã]o (do |dos |de )?(representante|vendedor|rep)",
      "ficha (do |de )?(representante|vendedor|rep)",
      "dashboard (do |de )?(representante|vendedor|rep)",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
      { name: "limit", type: "number", default: "10" },
    ],
    sql: `SELECT r.name as representante, r.region as regiao, r.performance_score as score,
  COUNT(DISTINCT st.id) as lojas,
  COALESCE(SUM(s.total_amount),0) as receita,
  COALESCE(SUM(s.quantity),0) as volume_vendido,
  COALESCE(SUM(ret.quantity),0) as qtd_devolvida,
  ROUND((COALESCE(SUM(ret.total_amount),0)/NULLIF(COALESCE(SUM(s.total_amount),0),0)*100),1) as taxa_devolucao,
  ROUND(AVG(s.unit_price),2) as preco_medio
FROM postgresql.public.representatives r
LEFT JOIN postgresql.public.stores st ON r.id = st.representative_id
LEFT JOIN postgresql.public.sales s ON r.id = s.representative_id
  AND s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
LEFT JOIN postgresql.public.returns ret ON r.id = ret.representative_id
  AND ret.return_date >= {period_start} AND ret.return_date <= CURRENT_DATE
WHERE r.is_active = true
GROUP BY r.name, r.region, r.performance_score
ORDER BY receita DESC
LIMIT {limit}`,
    description: "Performance completa do representante",
    example: "Qual a performance completa dos representantes?",
  },

  // ═══ 26. DEVOLUÇÕES — IMPACTO NO LUCRO ═══
  {
    id: "returns-profit-impact",
    category: "Devoluções",
    patterns: [
      "impacto (das |de )?devolu[cç]",
      "devolu[cç]ões? (afetam|impactam|prejudicam|reduzem)",
      "quanto (as |os )?devolu[cç]",
      "preju[ií]zo (com |por )?devolu[cç]",
      "devolu[cç]ões? (vs|x|versus|contra) (lucro|receita|faturamento)",
      "perda (com |por )?devolu[cç]",
      "custo (das |de )?devolu[cç]",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
      { name: "category", type: "category", default: "todas" },
    ],
    sql: `SELECT p.category as categoria,
  SUM(s.total_amount) as receita_bruta,
  COALESCE((SELECT SUM(r2.total_amount) FROM postgresql.public.returns r2
    JOIN postgresql.public.products p2 ON r2.product_id = p2.id
    WHERE p2.category = p.category AND r2.return_date >= {period_start} AND r2.return_date <= CURRENT_DATE),0) as valor_devolvido,
  ROUND(CAST((COALESCE((SELECT SUM(r2.total_amount) FROM postgresql.public.returns r2
    JOIN postgresql.public.products p2 ON r2.product_id = p2.id
    WHERE p2.category = p.category AND r2.return_date >= {period_start} AND r2.return_date <= CURRENT_DATE),0)/NULLIF(SUM(s.total_amount),0)*100) AS DECIMAL),1) as taxa_devolucao_pct,
  ROUND(CAST((SUM(s.total_amount)-COALESCE((SELECT SUM(r2.total_amount) FROM postgresql.public.returns r2
    JOIN postgresql.public.products p2 ON r2.product_id = p2.id
    WHERE p2.category = p.category AND r2.return_date >= {period_start} AND r2.return_date <= CURRENT_DATE),0)) AS DECIMAL),2) as receita_liquida
FROM postgresql.public.sales s
JOIN postgresql.public.products p ON s.product_id = p.id
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
  {category_filter}
GROUP BY p.category
ORDER BY taxa_devolucao_pct DESC`,
    description: "Impacto financeiro das devoluções no lucro por categoria",
    example: "Quanto as devoluções impactam o lucro?",
  },

  // ═══ 28. DEVOLUÇÕES — REGIÃO ═══
  {
    id: "returns-by-region",
    category: "Devoluções",
    patterns: [
      "devolu[cç]ão (por |da |de )?regi",
      "qual regi[aã]o (tem|teve) mais devolu",
      "regi[aã]o com (maior|pior) (taxa |índice |de )?devolu",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_6_months" },
    ],
    sql: `SELECT st.region as regiao,
  SUM(s.total_amount) as receita_bruta,
  COALESCE((SELECT SUM(r2.total_amount) FROM postgresql.public.returns r2
    JOIN postgresql.public.stores st2 ON r2.store_id = st2.id
    WHERE st2.region = st.region AND r2.return_date >= {period_start} AND r2.return_date <= CURRENT_DATE),0) as valor_devolvido,
  ROUND(CAST((COALESCE((SELECT SUM(r2.total_amount) FROM postgresql.public.returns r2
    JOIN postgresql.public.stores st2 ON r2.store_id = st2.id
    WHERE st2.region = st.region AND r2.return_date >= {period_start} AND r2.return_date <= CURRENT_DATE),0)/NULLIF(SUM(s.total_amount),0)*100) AS DECIMAL),1) as taxa_devolucao_pct,
  ROUND(CAST((SUM(s.total_amount)-COALESCE((SELECT SUM(r2.total_amount) FROM postgresql.public.returns r2
    JOIN postgresql.public.stores st2 ON r2.store_id = st2.id
    WHERE st2.region = st.region AND r2.return_date >= {period_start} AND r2.return_date <= CURRENT_DATE),0)) AS DECIMAL),2) as receita_liquida
FROM postgresql.public.sales s
JOIN postgresql.public.stores st ON s.store_id = st.id
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
GROUP BY st.region
ORDER BY taxa_devolucao_pct DESC`,
    description: "Devoluções por região com impacto no lucro líquido",
    example: "Qual região tem maior taxa de devolução?",
  },

  // ═══ 29. DEVOLUÇÕES — POR CLIENTE/LOJA ═══
  {
    id: "returns-by-store",
    category: "Devoluções",
    patterns: [
      "qual (cliente|loja) (tem|teve) mais devolu",
      "cliente com (mais|maior) devolu",
      "loja com (mais|maior) (taxa |índice |de )?devolu",
      "quem (devolve|retorna|cancela) mais",
      "top (clientes|lojas) (em |com |por )?devolu",
    ],
    parameters: [
      { name: "period", type: "period", default: "last_3_months" },
      { name: "limit", type: "number", default: "10" },
    ],
    sql: `SELECT st.name as loja, st.city as cidade, st.region as regiao,
  SUM(s.total_amount) as receita_bruta,
  COALESCE(SUM(r.total_amount),0) as valor_devolvido,
  COALESCE(COUNT(DISTINCT r.id),0) as qtd_devolucoes,
  ROUND(CAST((COALESCE(SUM(r.total_amount),0)/NULLIF(SUM(s.total_amount),0)*100) AS DECIMAL),1) as taxa_devolucao_pct,
  ROUND(CAST((SUM(s.total_amount)-COALESCE(SUM(r.total_amount),0)) AS DECIMAL),2) as receita_liquida
FROM postgresql.public.sales s
JOIN postgresql.public.stores st ON s.store_id = st.id
LEFT JOIN postgresql.public.returns r ON s.store_id = r.store_id
  AND r.return_date >= {period_start} AND r.return_date <= CURRENT_DATE
WHERE s.sale_date >= {period_start} AND s.sale_date <= CURRENT_DATE
GROUP BY st.name, st.city, st.region
HAVING COALESCE(COUNT(DISTINCT r.id),0) > 0
ORDER BY taxa_devolucao_pct DESC
LIMIT {limit}`,
    description: "Clientes/lojas com maior taxa de devolução",
    example: "Qual cliente tem mais devoluções?",
  },

  // ═══ 30. CUSTO DETALHADO POR PRODUTO ═══
  {
    id: "product-cost-breakdown",
    category: "Financeiro",
    patterns: [
      "custo (total|detalhado|completo|por|do) (produto|suco)",
      "quanto custa (produzir|fabricar)",
      "breakdown (de |do )?custo",
      "composi[cç][aã]o (do |de )?custo",
      "custo (de |com )?(marketing|log[ií]stica|embalagem|mat[eé]ria)",
      "gasto (com |de )?(marketing|log[ií]stica|embalagem|produ[cç][aã]o)",
    ],
    parameters: [
      { name: "limit", type: "number", default: "10" },
    ],
    sql: `SELECT p.name as produto, p.category as categoria, p.sell_price as preco_venda, p.cost_price as custo_producao,
  ROUND(CAST((p.sell_price * p.marketing_cost_pct/100) AS DECIMAL),2) as custo_marketing,
  ROUND(CAST((p.sell_price * p.logistics_cost_pct/100) AS DECIMAL),2) as custo_logistica,
  ROUND(CAST((p.sell_price * p.packaging_cost_pct/100) AS DECIMAL),2) as custo_embalagem,
  p.marketing_cost_pct as marketing_pct, p.logistics_cost_pct as logistica_pct, p.packaging_cost_pct as embalagem_pct,
  ROUND(CAST((p.cost_price + (p.sell_price*(p.marketing_cost_pct+p.logistics_cost_pct+p.packaging_cost_pct)/100)) AS DECIMAL),2) as custo_total,
  ROUND(CAST((p.sell_price - (p.cost_price + (p.sell_price*(p.marketing_cost_pct+p.logistics_cost_pct+p.packaging_cost_pct)/100))) AS DECIMAL),2) as lucro_unitario,
  ROUND(CAST(((p.sell_price - (p.cost_price + (p.sell_price*(p.marketing_cost_pct+p.logistics_cost_pct+p.packaging_cost_pct)/100)))/p.sell_price*100) AS DECIMAL),1) as margem_liquida_pct
FROM postgresql.public.products p
WHERE p.is_active = true
ORDER BY margem_liquida_pct DESC
LIMIT {limit}`,
    description: "Custo detalhado por produto: produção, marketing, logística, embalagem",
    example: "Quanto custa produzir cada suco considerando marketing e logística?",
  },
];

// ═══════════════════════════════════════════════
// Presets e valores
// ═══════════════════════════════════════════════

export const periodPresets: Record<string, { start: string; prevStart: string; label: string }> = {
  current_month: {
    start: "DATE_TRUNC('month', DATE '2025-12-01')",
    prevStart: "DATE_TRUNC('month', DATE_ADD('month', -1, DATE '2025-12-01'))",
    label: "este mês",
  },
  last_month: {
    start: "DATE_TRUNC('month', DATE_ADD('month', -1, DATE '2025-12-01'))",
    prevStart: "DATE_TRUNC('month', DATE_ADD('month', -2, DATE '2025-12-01'))",
    label: "último mês",
  },
  last_3_months: {
    start: "DATE_ADD('month', -3, DATE '2025-12-31')",
    prevStart: "DATE_ADD('month', -6, DATE '2025-12-31')",
    label: "últimos 3 meses",
  },
  last_6_months: {
    start: "DATE_ADD('month', -6, DATE '2025-12-31')",
    prevStart: "DATE_ADD('month', -12, DATE '2025-12-31')",
    label: "últimos 6 meses",
  },
  last_12_months: {
    start: "DATE_ADD('month', -12, DATE '2025-12-31')",
    prevStart: "DATE_ADD('month', -24, DATE '2025-12-31')",
    label: "último ano",
  },
  year_2024: {
    start: "DATE '2024-01-01'",
    prevStart: "DATE '2023-01-01'",
    label: "2024",
  },
  year_2025: {
    start: "DATE '2025-01-01'",
    prevStart: "DATE '2024-01-01'",
    label: "2025",
  },
};

export const regionValues: Record<string, string> = {
  todas: "1=1",
  sudeste: "st.region = 'Sudeste'",
  sul: "st.region = 'Sul'",
  nordeste: "st.region = 'Nordeste'",
  "centro-oeste": "st.region = 'Centro-Oeste'",
  norte: "st.region = 'Norte'",
  sp: "st.state = 'SP'",
  rj: "st.state = 'RJ'",
  mg: "st.state = 'MG'",
};

export const categoryValues: Record<string, string> = {
  todas: "1=1",
  tradicional: "p.category = 'tradicional'",
  citrico: "p.category = 'citrico'",
  tropical: "p.category = 'tropical'",
  premium: "p.category = 'premium'",
  light: "p.category = 'light'",
};

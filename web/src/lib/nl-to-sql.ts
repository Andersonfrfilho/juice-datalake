import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const SCHEMA_CONTEXT = `
You are a SQL query generator for a juice distributor's data lake running on Trino.

The data lake has two catalogs:

1. **postgresql** catalog (transactional database, schema: public):
   - representatives: id (INT), name (VARCHAR), email (VARCHAR), phone (VARCHAR), region (VARCHAR), performance_score (DECIMAL), hire_date (DATE), is_active (BOOLEAN)
   - products: id (INT), name (VARCHAR), category (VARCHAR - 'tradicional','citrico','tropical','premium','light'), flavor (VARCHAR), size_ml (INT), cost_price (DECIMAL), sell_price (DECIMAL), is_active (BOOLEAN), created_at (TIMESTAMP)
   - stores: id (INT), name (VARCHAR), city (VARCHAR), state (CHAR(2)), region (VARCHAR - 'Norte','Nordeste','Centro-Oeste','Sudeste','Sul'), type (VARCHAR - 'supermarket','convenience','wholesale'), representative_id (INT FK→representatives), opened_at (DATE)
   - sales: id (INT), product_id (INT FK→products), store_id (INT FK→stores), quantity (INT), unit_price (DECIMAL), total_amount (DECIMAL - computed as quantity*unit_price), sale_date (DATE), created_at (TIMESTAMP)

2. **hive** catalog (data lake on MinIO/S3, schema: datalake):
   - sales (partitioned by year/month): product_id (INT), store_id (INT), quantity (INT), unit_price (DOUBLE), total_amount (DOUBLE), sale_date (DATE)
   - products: id (INT), name (VARCHAR), category (VARCHAR), flavor (VARCHAR), size_ml (INT), sell_price (DOUBLE)
   - stores: id (INT), name (VARCHAR), city (VARCHAR), state (VARCHAR), region (VARCHAR), type (VARCHAR), opened_at (DATE)
   - daily_aggregations: sale_date (DATE), product_id (INT), total_quantity (BIGINT), total_revenue (DOUBLE), transaction_count (BIGINT), avg_unit_price (DOUBLE)

Rules:
- Use postgresql.public.* for live/current data queries
- Use hive.datalake.* for historical/aggregated queries
- You can JOIN across catalogs (federated query)
- Use DATE_ADD('month', -N, CURRENT_DATE) for relative dates when user says "last N months"
- Use CURRENT_DATE for today
- Always qualify table names with catalog.schema.table
- RETURN ONLY THE SQL without explanation, backticks, or markdown formatting
- Use Trino SQL syntax (not PostgreSQL-specific)
- For "which juice sells most", use SUM(total_amount) as revenue, ORDER BY DESC LIMIT
- For regional queries, join sales with stores on store_id
- For category queries, join sales with products on product_id
- For trends, use date_trunc() and GROUP BY
- Keep queries efficient: add LIMIT where appropriate (max 20 rows unless user asks for more)
- For "invest in next 3 months" type questions: consider combining growth_trend (REGR_SLOPE on recent months) with margin_pct, weighted equally
`;

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export async function translateToSQL(
  question: string,
  history: ChatMessage[] = []
): Promise<string> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: SCHEMA_CONTEXT },
  ];

  // Include last 6 messages for context
  const recentHistory = history.slice(-6).filter((m) => m.role !== "system");
  for (const msg of recentHistory) {
    messages.push({ role: msg.role, content: msg.content });
  }

  messages.push({
    role: "user",
    content: `Convert this business question to a Trino SQL query:\n\n"${question}"\n\nSQL:`,
  });

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.1,
    max_tokens: 500,
  });

  const sql = response.choices[0]?.message?.content?.trim() || "";

  // Clean up markdown formatting if present
  let cleanSQL = sql
    .replace(/^```sql\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Basic validation
  if (!cleanSQL.toUpperCase().startsWith("SELECT") && !cleanSQL.toUpperCase().startsWith("SHOW")) {
    throw new Error(`Generated query does not start with SELECT: ${cleanSQL.substring(0, 50)}`);
  }

  return cleanSQL;
}

export async function formatResponse(
  question: string,
  sql: string,
  result: { columns: { name: string }[]; rows: Record<string, unknown>[] }
): Promise<string> {
  if (result.rows.length === 0) {
    return "Nenhum dado encontrado para esta consulta. Tente ajustar o período ou os filtros.";
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are a business analyst for a juice distributor. Answer questions in Portuguese (Brazil) based on SQL query results. Be concise, data-driven, and helpful. Format numbers as Brazilian Real (R$). Include specific numbers from the data. If the data shows a clear trend or insight, mention it. Keep responses under 3 paragraphs.`,
    },
    {
      role: "user",
      content: `User question: "${question}"

SQL executed: ${sql}

Results (${result.rows.length} rows):
Columns: ${result.columns.map((c) => c.name).join(", ")}
Data: ${JSON.stringify(result.rows.slice(0, 20))}${result.rows.length > 20 ? `\n...and ${result.rows.length - 20} more rows` : ""}

Provide a clear, data-backed answer in Portuguese.`,
    },
  ];

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages,
    temperature: 0.3,
    max_tokens: 500,
  });

  return response.choices[0]?.message?.content?.trim() || "Não foi possível processar a resposta.";
}

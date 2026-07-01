import { periodPresets, regionValues, categoryValues } from "./question-templates";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";

const SCHEMA_PROMPT = `You are a SQL generator for a juice distributor data lake (Trino SQL syntax).
Database: postgresql.public
Tables:
- products(id, name, category, flavor, size_ml, cost_price, sell_price)
  categories: 'tradicional','citrico','tropical','premium','light'
- stores(id, name, city, state, region, type, opened_at)
  regions: 'Norte','Nordeste','Centro-Oeste','Sudeste','Sul'
  types: 'supermarket','convenience','wholesale'
- sales(id, product_id→products, store_id→stores, quantity, unit_price, total_amount=quantity*unit_price, sale_date)

Date functions: DATE_ADD('month', -3, CURRENT_DATE), CURRENT_DATE, DATE_TRUNC('month', ...)
Always use postgresql.public.table_name syntax.
RETURN ONLY RAW SQL. No markdown, no backticks, no explanation.
Use Portuguese column aliases when it makes sense.
Keep queries under 20 lines.`;

async function ollamaChat(prompt: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: "system", content: SCHEMA_PROMPT },
        { role: "user", content: prompt },
      ],
      options: { temperature: 0.1, num_predict: 500 },
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status}`);
  }

  const data = await res.json();
  return data.message?.content || "";
}

export async function translateOllama(question: string): Promise<string> {
  const sql = await ollamaChat(
    `Convert this business question to a Trino SQL query:\n"${question}"\n\nSQL:`
  );

  let clean = sql
    .replace(/^```sql\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (!clean.toUpperCase().startsWith("SELECT") && !clean.toUpperCase().startsWith("SHOW")) {
    throw new Error(`Ollama generated invalid SQL: ${clean.substring(0, 80)}`);
  }

  return clean;
}

export async function formatOllamaResponse(
  question: string,
  sql: string,
  result: { columns: { name: string }[]; rows: Record<string, unknown>[] }
): Promise<string> {
  if (result.rows.length === 0) {
    return "Nenhum dado encontrado para esta consulta. Tente ajustar o período ou os filtros.";
  }

  const prompt = `You are a business analyst for a juice distributor. Answer in Portuguese (Brazil).
User asked: "${question}"
SQL: ${sql}
Results (${result.rows.length} rows): ${JSON.stringify(result.rows.slice(0, 10))}
Give a short, data-backed answer. Include key numbers. Max 3 sentences.`;

  const response = await ollamaChat(prompt);
  return response || "Dados encontrados, mas não foi possível formatar a resposta.";
}

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
    return res.ok;
  } catch {
    return false;
  }
}

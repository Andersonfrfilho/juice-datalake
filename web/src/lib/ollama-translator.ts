import { OLLAMA_SYSTEM_PROMPT } from "./ollama-context";
import { periodPresets, regionValues, categoryValues } from "./question-templates";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";

async function ollamaChat(prompt: string, systemPrompt?: string): Promise<string> {
  const res = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      stream: false,
      messages: [
        { role: "system", content: systemPrompt || OLLAMA_SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      options: { temperature: 0.1, num_predict: 500 },
    }),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`);
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
    return "Nenhum dado encontrado para esta consulta.\n\n💡 Tente ampliar o período, remover filtros de região, ou ajustar thresholds (ex: use 10% em vez de 30%).";
  }

  const prompt = `You are a business analyst for a juice distributor. Answer in Portuguese (Brazil). Use markdown:
- ### headers for sections
- **bold** for key numbers/products
- | tables | for comparing items
- Emojis (💰📦📊📈📉🏪) for visual cues
- Max 3 paragraphs
- Do NOT add a "Sugestões" or "Recomendações" section
User asked: "${question}"
SQL: ${sql}
Results (${result.rows.length} rows): ${JSON.stringify(result.rows.slice(0, 10))}
Give a concise, data-backed answer in Portuguese with markdown.`;

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

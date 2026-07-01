import Anthropic from "@anthropic-ai/sdk";

const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || "claude-haiku-4-5-20251001";
const ANTHROPIC_TIMEOUT_MS = 15000;

let anthropicClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!anthropicClient) {
    anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return anthropicClient;
}

function firstTextBlock(content: Anthropic.Messages.ContentBlock[]): string {
  const block = content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

export async function chatAnthropic(prompt: string, systemPrompt?: string): Promise<string> {
  const response = await getClient().messages.create(
    {
      model: ANTHROPIC_MODEL,
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    },
    { timeout: ANTHROPIC_TIMEOUT_MS }
  );

  return firstTextBlock(response.content).trim();
}

export async function formatAnthropicResponse(
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

  const text = await chatAnthropic(prompt);
  return text || "Dados encontrados, mas não foi possível formatar a resposta.";
}

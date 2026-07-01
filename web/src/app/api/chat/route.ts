import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/trino";
import { matchOrSuggest } from "@/lib/template-matcher";
import { translateOllama, formatOllamaResponse, isOllamaAvailable } from "@/lib/ollama-translator";
import { z } from "zod";

const chatRequestSchema = z.object({
  question: z.string().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() }))
    .optional().default([]),
});

const hasOpenAI = !!process.env.OPENAI_API_KEY && !process.env.OPENAI_API_KEY.startsWith("sk-your-");

async function getOpenAISQL(question: string, history: { role: string; content: string }[]) {
  const { translateToSQL, formatResponse } = await import("@/lib/nl-to-sql");
  return {
    sql: await translateToSQL(question, history as any),
    format: async (s: string, r: any) => formatResponse(question, s, r),
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = chatRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const { question, history } = parsed.data;

    // ═══ 1. Template matching (deterministic, free, instant) ═══
    const result = matchOrSuggest(question);

    // No match at all → return suggestions
    if (!result.match) {
      return NextResponse.json({
        answer: "Não entendi exatamente sua pergunta. Aqui estão algumas sugestões do que posso responder:",
        engine: "suggestions",
        suggestions: result.suggestions,
        sql: null,
      });
    }

    // Got a match
    let sql = result.match.resolvedSQL;
    let engine: string = "template";
    let formatAnswer: (s: string, r: any) => Promise<string>;

    if (result.match.confidence === "high") {
      formatAnswer = async (_s, r) => {
        const cols = r.columns.map((c: any) => c.name).join(", ");
        return `Template: **${result.match!.template.description}**. ${r.rows.length} resultados.`;
      };
    } else if (result.match.confidence === "medium") {
      formatAnswer = async (_s, r) => {
        const cols = r.columns.map((c: any) => c.name).join(", ");
        return `Template (correspondência média): **${result.match!.template.description}**. ${r.rows.length} resultados.`;
      };
    } else {
      // Low confidence — try Ollama or OpenAI if available
      const ollamaReady = await isOllamaAvailable();
      if (ollamaReady) {
        try {
          sql = await translateOllama(question);
          engine = "ollama";
          formatAnswer = async (s, r) => formatOllamaResponse(question, s, r);
        } catch {
          // Fallback to the low-confidence template
          engine = "template";
          formatAnswer = async (_s, r) =>
            `Resposta aproximada (template): **${result.match!.template.description}**. ${r.rows.length} resultados.`;
        }
      } else if (hasOpenAI) {
        try {
          const openai = await getOpenAISQL(question, history);
          sql = openai.sql;
          engine = "openai";
          formatAnswer = async (s, r) => openai.format(s, r);
        } catch {
          engine = "template";
          formatAnswer = async (_s, r) =>
            `Resposta aproximada (template): ${r.rows.length} resultados.`;
        }
      } else {
        engine = "template";
        formatAnswer = async (_s, r) =>
          `Resposta aproximada (baixa confiança - ative Ollama para melhor precisão): ${r.rows.length} resultados.`;
      }
    }

    // Execute SQL
    let queryResult: { columns: { name: string; type: string }[]; rows: Record<string, unknown>[] };
    try {
      queryResult = await executeQuery(sql);
    } catch (err: any) {
      return NextResponse.json({
        answer: "Erro ao consultar o data lake.",
        error: err.message,
        sql,
        engine,
      }, { status: 503 });
    }

    const answer = await formatAnswer(sql, queryResult);

    return NextResponse.json({
      answer,
      sql,
      engine,
      rowCount: queryResult.rows.length,
      data: queryResult.rows.slice(0, 20),
    });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json({ answer: "Erro inesperado." }, { status: 500 });
  }
}

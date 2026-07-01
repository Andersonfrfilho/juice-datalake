import { NextRequest, NextResponse } from "next/server";
import { executeQuery } from "@/lib/trino";
import { matchOrSuggest } from "@/lib/template-matcher";
import { translateOllama, formatOllamaResponse, isOllamaAvailable } from "@/lib/ollama-translator";
import { OLLAMA_SYSTEM_PROMPT } from "@/lib/ollama-context";
import { z } from "zod";

const chatRequestSchema = z.object({
  question: z.string().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant", "system"]), content: z.string() }))
    .optional().default([]),
  askedQuestions: z.array(z.string()).optional().default([]),
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

    const { question, history, askedQuestions } = parsed.data;

    // ═══ 1. Template matching (deterministic, free, instant) ═══
    const result = matchOrSuggest(question);

    // No match at all → return suggestions
    if (!result.match) {
      return NextResponse.json({
        answer: addGlossary("Não entendi exatamente sua pergunta. Aqui estão algumas sugestões do que posso responder:"),
        engine: "suggestions",
        suggestions: result.suggestions.filter(
        (e: string) => !(askedQuestions || []).some((q: string) => isSimilar(e, q))
      ),
        allExamples: result.allExamples,
        sql: null,
      });
    }

    // Got a match — always use template SQL (deterministic, safe)
    let sql = result.match.resolvedSQL;
    let engine: string = "template";
    let formatAnswer: (s: string, r: any) => Promise<string>;
    let addContext = false;

    if (result.match.confidence === "high") {
      // Pure template, no AI needed. But add market context for financial/trend questions.
      formatAnswer = (_s, r) => Promise.resolve(formatTemplateResponse(result.match!.template.description, r));
      addContext = ["Financeiro", "Tendências", "Previsão", "Devoluções"].includes(result.match.template.category);
      if (addContext) engine = "template+context";
    } else if (result.match.confidence === "medium") {
      // Template data, no AI formatting
      formatAnswer = (_s, r) => Promise.resolve(formatTemplateResponse(result.match!.template.description, r));
      engine = "template";
    } else {
      // Low confidence — template SQL + Ollama formatting (if available)
      engine = "template-low";
      const ollamaReady = await isOllamaAvailable();
      if (ollamaReady) {
        formatAnswer = async (s, r) => {
          try {
            const formatted = await formatOllamaResponse(question, s, r);
            engine = "ollama";
            return formatted;
          } catch {
            return formatTemplateResponse(result.match!.template.description, r);
          }
        };
      } else {
        formatAnswer = (_s, r) => Promise.resolve(formatTemplateResponse(result.match!.template.description, r));
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

    let marketContext = "";
    if (addContext) {
      const ollamaReady = await isOllamaAvailable();
      if (ollamaReady) {
        marketContext = await getMarketContext(question, answer);
      }
    }

    const finalAnswer = addGlossary(answer + marketContext);

    return NextResponse.json({
      answer: finalAnswer,
      sql,
      engine,
      rowCount: queryResult.rows.length,
      data: queryResult.rows.slice(0, 20),
      suggestions: result.allExamples.filter(
        (e) => !(askedQuestions || []).some((q: string) => isSimilar(e, q))
      ).slice(0, 5),
      allExamples: result.allExamples,
    });
  } catch (err: any) {
    console.error("Chat API error:", err);
    return NextResponse.json({ answer: "Erro inesperado." }, { status: 500 });
  }
}

function isSimilar(a: string, b: string): boolean {
  const na = a.toLowerCase().trim();
  const nb = b.toLowerCase().trim();
  if (na === nb) return true;
  const wordsA = new Set(na.split(/\s+/).filter(w => w.length > 2));
  const wordsB = new Set(nb.split(/\s+/).filter(w => w.length > 2));
  if (wordsA.size === 0 || wordsB.size === 0) return false;
  const intersection = [...wordsA].filter(w => wordsB.has(w)).length;
  const minSize = Math.min(wordsA.size, wordsB.size);
  return intersection / minSize > 0.7;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
}

function formatNumber(n: number): string {
  return new Intl.NumberFormat("pt-BR").format(n);
}

function formatTemplateResponse(description: string, result: { columns: { name: string }[]; rows: Record<string, unknown>[] }): string {
  if (result.rows.length === 0) {
    // Smart hints based on common failure patterns
    const hints: string[] = [];
    if (description.includes("abaixo da média")) {
      hints.push("Tente reduzir o percentual (ex: '10% abaixo da média') ou remover o filtro de região");
    }
    if (description.includes("Sudeste") || description.includes("região")) {
      hints.push("Experimente sem filtro de região para ver todas as localidades");
    }
    hints.push("Verifique se o período selecionado tem dados disponíveis");
    
    return `Nenhum dado encontrado para "${description}".\n\n${hints.map(h => `💡 ${h}`).join("\n")}`;
  }

  const row = result.rows[0];
  const cols = Object.keys(row);

  // Column label mapping (DB name → Portuguese)
  const labelMap: Record<string, string> = {
    produto: "Produto", name: "Produto", nome: "Nome", loja: "Loja",
    categoria: "Categoria", category: "Categoria", regiao: "Região", region: "Região",
    receita: "Receita (R$)", revenue: "Receita (R$)", receita_bruta: "Receita Bruta (R$)",
    receita_liquida: "Receita Líquida (R$)", receita_atual: "Receita Atual (R$)", receita_anterior: "Receita Anterior (R$)",
    receita_ultimo_mes: "Receita Último Mês (R$)", receita_3m: "Receita 3M (R$)",
    volume: "Volume (un.)", qtd_devolvida: "Qtd Devolvida (un.)", qtd: "Quantidade (un.)",
    ticket_medio: "Ticket Médio (R$)", avg_ticket: "Ticket Médio (R$)",
    preco_medio: "Preço Médio (R$)", preco_minimo: "Preço Mín (R$)", preco_maximo: "Preço Máx (R$)",
    margem_brl: "Margem (R$)", margem_pct: "Margem (%)", margin_pct: "Margem (%)",
    crescimento_pct: "Crescimento (%)", growth_pct: "Crescimento (%)",
    participacao_pct: "Participação (%)", taxa_devolucao_pct: "Taxa Devolução (%)",
    gap_pct: "Gap (%)", diff_pct: "Dif (%)",
    custo_semanal: "Custo Semanal (R$)", custo_mensal: "Custo Mensal (R$)",
    custo_producao: "Custo Produção (R$)", custo_marketing: "Custo Marketing (R$)",
    custo_logistica: "Custo Logística (R$)", custo_embalagem: "Custo Embalagem (R$)",
    custo_total: "Custo Total (R$)", custo_por_loja: "Custo/Loja (R$)",
    lucro_unitario: "Lucro Unitário (R$)", margem_liquida_pct: "Margem Líquida (%)",
    km_semanais: "Km/Semana", km_por_loja: "Km/Loja", distancia_total_km: "Distância Total (Km)",
    roi: "ROI", lojas: "Lojas", lojas_ativas: "Lojas Ativas", lojas_geridas: "Lojas Geridas",
    clientes: "Clientes", clientes_para_breakeven: "Clientes p/ Breakeven",
    ocorrencias: "Ocorrências", motivo: "Motivo", reason: "Motivo",
    transacoes: "Transações", vendas: "Vendas", devolucoes: "Devoluções",
    status: "Status", direcao: "Tendência", trend_direction: "Tendência",
    populacao: "População", population_estimate: "População",
    lojas_por_100k_hab: "Lojas/100k hab", receita_per_capita: "Receita per Capita (R$)",
    projecao_mes1: "Projeção Mês 1 (R$)", projecao_mes2: "Projeção Mês 2 (R$)", projecao_mes3: "Projeção Mês 3 (R$)",
    tipo: "Tipo", type: "Tipo", cidade: "Cidade", city: "Cidade",
    uf: "UF", state: "UF",     mes: "Mês", month: "Mês", mes_num: "Mês (nº)",
    representante: "Representante", score: "Score", score_medio: "Score Médio",
    marketing_pct: "Marketing (%)", logistica_pct: "Logística (%)", embalagem_pct: "Embalagem (%)",
    tempo_visitas_min: "Tempo Visitas (min)", min_por_loja: "Min/Loja",     media_diaria: "Média Diária (un.)",
    media_por_loja: "Média/Loja (un.)", valor_devolvido: "Valor Devolvido (R$)",
    media_regional: "Média Regional (R$)", volatilidade_preco: "Volatilidade Preço (%)",
    preco_venda: "Preço Venda (R$)",
    id: "#", sale_date: "Data", return_date: "Data Devolução",
    visit_day: "Dia Visita", visit_order: "Ordem", visit_duration_min: "Duração (min)",
    distance_from_prev_km: "Distância (Km)",
    qtd_lojas: "Qtd Lojas", receita_por_loja: "Receita/Loja (R$)", receita_media_diaria: "Receita Média Dia (R$)",
    produtos_diferentes: "Produtos Diferentes", produtos_ativos: "Produtos Ativos",
    qtd_devolucoes: "Qtd Devoluções",
    volume_total: "Volume Total (un.)", volume_vendido: "Volume Vendido (un.)",
    total_transacoes: "Total Transações", transactions: "Transações",
    representantes: "Representantes",
    taxa_devolucao: "Taxa Devolução (%)",
    receita_2024: "Receita 2024 (R$)", receita_2025: "Receita 2025 (R$)",
    receita_total: "Receita Total (R$)",
    slope: "Tendência", stores: "Lojas", t: "Tendência", avg_rev: "Média Receita (R$)",
    avg_revenue: "Média Receita (R$)",
  };

  // Try to build a natural language response from the first row
  const topItem = cols.find(c => c.includes("produto") || c.includes("name") || c.includes("nome") || c.includes("loja") || c.includes("cliente"));
  const regionCol = cols.find(c => c.includes("regi"));
  const revenueCol = cols.find(c => c.includes("receita") || c.includes("revenue"));
  const volumeCol = cols.find(c => c.includes("volume") || c.includes("quantidade") || c.includes("qtd"));
  const pctCol = cols.find(c => c.includes("pct") || c.includes("%") || c.includes("crescimento"));
  const marginCol = cols.find(c => c.includes("margem"));
  const countCol = cols.find(c => c.includes("count") || c.includes("total") || c.includes("lojas"));

  const parts: string[] = [];

  if (topItem && row[topItem]) {
    parts.push(`**${row[topItem]}**`);
    if (regionCol && row[regionCol]) parts.push(`*${row[regionCol]}*`);
  }
  if (revenueCol && row[revenueCol] && Number(row[revenueCol]) > 0) {
    parts.push(`💰 ${formatCurrency(Number(row[revenueCol]))}`);
  }
  if (volumeCol && row[volumeCol] && Number(row[volumeCol]) > 0) {
    parts.push(`📦 ${formatNumber(Number(row[volumeCol]))} un`);
  }
  if (marginCol && row[marginCol]) {
    parts.push(`📊 margem ${row[marginCol]}%`);
  }
  if (pctCol && row[pctCol]) {
    const v = Number(row[pctCol]);
    parts.push(`${v >= 0 ? "📈" : "📉"} ${v >= 0 ? "+" : ""}${v}%`);
  }
  if (countCol && row[countCol]) {
    parts.push(`🏪 ${row[countCol]} lojas`);
  }

  const detail = parts.join("  \n");
  const more = result.rows.length > 1 ? `\n\n*Mais ${result.rows.length - 1} resultados nos dados abaixo.*` : "";

  // Build a markdown table if multiple rows
  let table = "";
  if (result.rows.length > 1) {
    const headers = result.columns.map(c => labelMap[c.name] || c.name);
    table += "\n\n| " + headers.join(" | ") + " |\n";
    table += "|" + headers.map(() => "---").join("|") + "|\n";
    for (const r of result.rows.slice(0, 10)) {
      const vals = result.columns.map(c => {
        const v = r[c.name];
        const hLower = c.name.toLowerCase();
        if (v === null || v === undefined) return "-";
        const num = Number(v);
        if (isNaN(num)) return String(v);
        if (hLower.includes("pct") || hLower.includes("taxa") || hLower.includes("percent") || hLower.includes("margem") && !hLower.includes("brl")) {
          return `${num.toFixed(1)}%`;
        }
        if (hLower.includes("receita") || hLower.includes("revenue") || hLower.includes("valor") || hLower.includes("ticket") || hLower.includes("preco") || hLower.includes("custo") || hLower.includes("lucro") || hLower.includes("margem_brl")) {
          return formatCurrency(num);
        }
        if (hLower.includes("populacao") || hLower.includes("volume") || hLower.includes("qtd") || hLower.includes("quantidade") || hLower.includes("lojas") || hLower.includes("ocorrencias") || hLower.includes("vendas") || hLower.includes("clientes") || hLower.includes("transacoes") || hLower.includes("devolucoes") || hLower.includes("km")) {
          return formatNumber(num);
        }
        return String(v);
      });
      table += "| " + vals.join(" | ") + " |\n";
    }
  }

  return `### ${description}\n\n${detail}${more}${table}${table ? "\n\n<details><summary>📖 Legenda das unidades</summary>\n\n(R$) = Reais · (un.) = Unidades · (%) = Percentual · (Km) = Quilômetros · (min) = Minutos\n</details>" : ""}`;
}

const GLOSSARY: Record<string, string> = {
  "ticket médio": "valor médio gasto por compra",
  "receita": "faturamento total",
  "margem": "lucro bruto — preço de venda menos custo",
  "ROI": "retorno sobre investimento (receita ÷ custo)",
  "breakeven": "ponto de equilíbrio (receita = custo)",
  "market share": "participação percentual no mercado",
  "YoY": "ano contra ano (year-over-year)",
  "sazonalidade": "variação de vendas conforme a época do ano",
  "giro": "velocidade com que o produto é vendido",
  "elasticidade": "sensibilidade da demanda à variação de preço",
  "CTE": "Common Table Expression (subconsulta nomeada)",
  "gap percentual": "diferença percentual entre valor real e referência",
  "score de performance": "nota de avaliação do representante (0-5)",
  "receita per capita": "receita dividida pela população da cidade",
  "taxa de devolução": "percentual do faturamento perdido com devoluções",
  "receita líquida": "receita bruta menos o valor devolvido",
  "lucro líquido estimado": "receita líquida menos custo dos produtos vendidos",
};

function addGlossary(text: string): string {
  let result = text;
  for (const [term, definition] of Object.entries(GLOSSARY)) {
    const regex = new RegExp(`(${term})`, "gi");
    let first = true;
    result = result.replace(regex, (match) => {
      if (first) {
        first = false;
        return `${match} (${definition})`;
      }
      return match;
    });
  }
  return result;
}

async function getMarketContext(question: string, answer: string): Promise<string> {
  const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";
  const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";

  try {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        stream: false,
        messages: [
          { role: "system", content: OLLAMA_SYSTEM_PROMPT },
          { role: "user", content: `Pergunta do usuário: "${question}"
Dados da resposta: "${answer.substring(0, 400)}"

Com base nos benchmarks do setor de bebidas Brasil 2026 que você conhece (margem 35-45%, crescimento 8-12%, devolução 2-5%, ticket R$150-400), adicione UMA frase curta comparando estes dados com o mercado. Exemplos:
- "Margem acima da média do setor (35-45%)"
- "Crescimento alinhado com o mercado (8-12%)"
- "Ticket dentro da faixa esperada para a região"

Seja específico. NÃO use "N/A". Se não souber comparar, diga "Dados alinhados com as médias do setor de bebidas 2026."
Responda APENAS a frase comparativa.` },
        ],
        options: { temperature: 0.3, num_predict: 200 },
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return "";
    const data = await res.json();
    const ctx = (data.message?.content || "").trim();
    if (!ctx || ctx === "N/A" || ctx.includes("N/A") || ctx.length < 10) return "";
    return `\n\n---\n📊 *Contexto de mercado 2026:* ${ctx}`;
  } catch {
    return "";
  }
}

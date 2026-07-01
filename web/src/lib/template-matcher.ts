import {
  questionTemplates,
  type QuestionTemplate,
  periodPresets,
  regionValues,
  categoryValues,
} from "./question-templates";

export interface MatchedTemplate {
  template: QuestionTemplate;
  resolvedSQL: string;
  params: Record<string, string>;
  confidence: "high" | "medium" | "low";
}

export interface MatchResult {
  match: MatchedTemplate | null;
  suggestions: string[];
  allExamples: string[];
}

// Normalize: remove accents, special chars, lowercase, collapse spaces
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Split into meaningful tokens (remove stop words)
function tokenize(text: string): string[] {
  const stops = new Set([
    "de", "da", "do", "das", "dos", "em", "no", "na", "nos", "nas", "a", "o", "as", "os",
    "e", "que", "um", "uma", "para", "com", "por", "se", "mais", "menos", "foi", "sera",
    "esta", "estao", "qual", "quais", "como", "onde", "quando", "quem", "me", "fale",
    "mostre", "exiba", "liste", "quero", "gostaria", "poderia", "pode", "saber", "ver",
  ]);
  return normalizeText(text)
    .split(/\s+/)
    .filter((w) => w.length > 1 && !stops.has(w));
}

// ═══════ Keyword categories for fallback matching ═══════

const templateKeywords: Record<string, string[]> = {};
for (const t of questionTemplates) {
  templateKeywords[t.id] = tokenize(
    t.description + " " + t.example + " " + t.patterns.join(" ")
  );
}

// ═══════ Scoring ═══════

function regexScore(pattern: string, text: string): number {
  try {
    const regex = new RegExp(pattern, "i");
    const match = text.match(regex);
    if (match) return (match[0].length / text.length) * 100;
    return 0;
  } catch {
    return 0;
  }
}

function keywordScore(templateId: string, tokens: string[]): number {
  const tkw = templateKeywords[templateId] || [];
  let hits = 0;
  for (const token of tokens) {
    if (tkw.includes(token)) hits++;
    // Partial match — require both sides to be long enough that the overlap is
    // meaningful, since templateKeywords includes short regex-syntax remnants
    // (e.g. "es", "aa") stripped from `patterns` that would otherwise substring-match
    // unrelated words (e.g. "clientes" ~ "es") and skew the fallback ranking.
    else {
      for (const kw of tkw) {
        if (kw.length >= 4 && token.length >= 4 && (kw.includes(token) || token.includes(kw))) {
          hits += 0.5;
          break;
        }
      }
    }
  }
  return tokens.length > 0 ? (hits / tokens.length) * 100 : 0;
}

// ═══════ Parameter extraction ═══════

function extractRegion(text: string): string {
  const n = normalizeText(text);
  if (n.match(/sudeste|s[aã]o paulo|minas|espirito santo|rio de janeiro|campinas|guarulhos|santos|vit[oó]ria/)) return "sudeste";
  if (n.match(/\bsul\b|paran[aá]|santa catarina|rio grande do sul|porto alegre|curitiba|florian[oó]polis|londrina/)) return "sul";
  if (n.match(/nordeste|bahia|pernambuco|cear[aá]|maranh[aã]o|salvador|recife|fortaleza|natal|s[aã]o lu[ií]s/)) return "nordeste";
  if (n.match(/centro|bras[ií]lia|goi[aá]s|mato grosso|campo grande|cuiab[aá]/)) return "centro-oeste";
  if (n.match(/\bnorte\b|amazonas|par[aá]\b|roraima|amap[aá]|manaus|bel[eé]m|porto velho|macap[aá]/)) return "norte";
  if (n.match(/\bsp\b|\bs[aã]o paulo\b/) && !n.match(/sul|nordeste/)) return "sp";
  if (n.match(/\brj\b|\brio\b/)) return "rj";
  return "todas";
}

function extractCategory(text: string): string {
  const n = normalizeText(text);
  if (n.match(/citrico|acerola|siciliano|tangerina|gengibre/)) return "citrico";
  if (n.match(/tropical|manga|goiaba|caju|a[cç]ai|cupua[cç]u/)) return "tropical";
  if (n.match(/tradicional|laranja|uva|ma[cç][aã]|maracuj[aá]|abacaxi|lim[aã]o/)) return "tradicional";
  if (n.match(/premium|organi|mirtilo|rom[aã]|coco|detox|verde/)) return "premium";
  if (n.match(/light|zero|mate|diet/)) return "light";
  return "todas";
}

function extractPeriod(text: string): string {
  const n = normalizeText(text);
  if (n.match(/\b(este|esse|neste|nesse)\s*(mes|month)\b|\bmes\s*(atual|corrente)\b|\bhoje\b/)) return "current_month";
  if (n.match(/\bultimo\s*mes\b|\bmes\s*passado\b|\bmes\s*anterior\b/) && !n.includes("trimestre") && !n.includes("semestre")) return "last_month";
  if (n.match(/\bultimo[s]?\s*3\s*mes|\bultimo\s*trimestre\b|\btrimestre\b/)) return "last_3_months";
  if (n.match(/\bultimo[s]?\s*6\s*mes|\bultimo\s*semestre\b|\bsemestre\b/)) return "last_6_months";
  if (n.match(/\bultimo[s]?\s*(12|ano)\b|\bultimo\s*ano\b|\bano\s*passado\b|\b12\s*meses\b/) && !n.match(/\b2\s*anos\b/)) return "last_12_months";
  if (n.includes("2024")) return "year_2024";
  if (n.includes("2025")) return "year_2025";
  return "last_3_months";
}

function extractMetric(text: string): string {
  const n = normalizeText(text);
  if (n.match(/\b(receita|faturamento|faturou|vendeu\s*mais\s*em\s*(valor|dinheiro|r\$|real)|dinheiro|r\$)\b/)) return "receita";
  if (n.match(/\b(volume|quantidade|unidade|litro|ml|caixa|garrafa)\b/)) return "volume";
  return "receita";
}

function extractNumber(text: string, defaultVal: string): string {
  const match = text.match(/\b(\d{1,2})\b/);
  if (match) {
    const num = parseInt(match[1]);
    if (num >= 1 && num <= 50) return String(num);
  }
  return defaultVal;
}

// ═══════ SQL resolver ═══════

function resolveSQL(template: QuestionTemplate, params: Record<string, string>): string {
  let sql = template.sql;

  const period = periodPresets[params.period] || periodPresets.last_3_months;
  sql = sql.replace(/\{period_start\}/g, period.start);
  sql = sql.replace(/\{prev_period_start\}/g, period.prevStart);
  sql = sql.replace(/CURRENT_DATE\b/g, "DATE '2025-12-31'");
  sql = sql.replace(/'\{region\}'/g, `'${params.region}'`);
  sql = sql.replace(/\{region\}/g, params.region || "todas");

  const regionClause = regionValues[params.region] || "1=1";
  sql = sql.replace(/\{region_filter\}/g, params.region === "todas" ? "" : `AND ${regionClause}`);

  const categoryClause = categoryValues[params.category] || "1=1";
  sql = sql.replace(/\{category_filter\}/g, params.category === "todas" ? "" : `AND ${categoryClause}`);

  const orderBy = params.metric === "volume" ? "volume" : "receita";
  sql = sql.replace(/\{order_by\}/g, orderBy);
  sql = sql.replace(/\{group_by\}/g, params.region !== "todas" ? "region" : "st.region");
  sql = sql.replace(/\{group_col\}/g, "region");

  if (params.limit) sql = sql.replace(/\{limit\}/g, params.limit);
  if (params.horizon) sql = sql.replace(/\{horizon\}/g, params.horizon);
  if (params.threshold) sql = sql.replace(/\{threshold\}/g, params.threshold);

  return sql;
}

function extractParams(template: QuestionTemplate, question: string): Record<string, string> {
  const params: Record<string, string> = {};
  for (const param of template.parameters) {
    let value = param.default;
    switch (param.type) {
      case "region": value = extractRegion(question); break;
      case "category": value = extractCategory(question); break;
      case "period": value = extractPeriod(question); break;
      case "metric": value = extractMetric(question); break;
      case "number": value = extractNumber(question, param.default); break;
    }
    params[param.name] = value;
  }
  return params;
}

// ═══════ Main matching: regex → keyword fallback → suggestions ═══════

export function matchOrSuggest(question: string): MatchResult {
  const allExamples = questionTemplates.map((t) => t.example);

  if (!question || question.length < 3) {
    return { match: null, suggestions: allExamples.slice(0, 5), allExamples };
  }

  const normalized = normalizeText(question);
  const tokens = tokenize(question);

  // Phase 1: Regex matching
  let bestRegex: { template: QuestionTemplate; score: number } | null = null;
  for (const template of questionTemplates) {
    let maxScore = 0;
    for (const pattern of template.patterns) {
      const score = regexScore(pattern, normalized);
      if (score > maxScore) maxScore = score;
    }
    if (maxScore > (bestRegex?.score || 0)) {
      bestRegex = { template, score: maxScore };
    }
  }

  // Phase 2: If regex found a decent match, use it
  if (bestRegex && bestRegex.score >= 0.5) {
    const template = bestRegex.template;
    const confidence: "high" | "medium" | "low" =
      bestRegex.score > 15 ? "high" : bestRegex.score > 3 ? "medium" : "low";
    const params = extractParams(template, question);
    const sql = resolveSQL(template, params);

    return {
      match: { template, resolvedSQL: sql, params, confidence },
      suggestions: [],
      allExamples,
    };
  }

  // Phase 3: Keyword overlap fallback
  let bestKw: { template: QuestionTemplate; score: number } | null = null;
  for (const template of questionTemplates) {
    const score = keywordScore(template.id, tokens);
    if (score > (bestKw?.score || 0)) {
      bestKw = { template, score };
    }
  }

  if (bestKw && bestKw.score >= 8) {
    const template = bestKw.template;
    const params = extractParams(template, question);
    const sql = resolveSQL(template, params);

    return {
      match: { template, resolvedSQL: sql, params, confidence: "low" },
      suggestions: [],
      allExamples,
    };
  }

  // Phase 4: No match — return ranked suggestions
  const scored = questionTemplates
    .map((t) => ({ template: t, score: keywordScore(t.id, tokens) }))
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (scored.length > 0) {
    return {
      match: null,
      suggestions: scored.map((s) => s.template.example),
      allExamples,
    };
  }

  // Phase 5: Nothing — return popular defaults
  return {
    match: null,
    suggestions: [
      "Qual suco mais vendeu no último trimestre?",
      "Qual região teve maior crescimento?",
      "Como estão as vendas este mês?",
      "Qual a sazonalidade de vendas?",
      "Qual categoria tem melhor margem?",
    ],
    allExamples,
  };
}

export const matchTemplate = (question: string): MatchedTemplate | null =>
  matchOrSuggest(question).match;

export const getAllExamples = (): string[] =>
  questionTemplates.map((t) => t.example);

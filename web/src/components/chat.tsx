"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { marked } from "marked";
import { Send, Loader2, AlertCircle, Database, FileCode, Brain, Globe, Copy, Check } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  data?: Record<string, unknown>[];
  engine?: string;
  suggestions?: string[];
  feedback?: "helpful" | "not-helpful" | null;
}

const DEFAULT_SUGGESTIONS = [
  "Qual suco mais vendeu no último trimestre?",
  "Qual região teve maior crescimento em 2025?",
  "Qual categoria de suco tem melhor margem?",
  "Qual a previsão de vendas para os próximos 3 meses?",
  "Qual rota tem melhor ROI?",
];

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Olá! Sou o assistente de dados da distribuidora de sucos. Combino **templates determinísticos** (instantâneos e precisos) com **Ollama local** (IA gratuita para contexto de mercado 2026).\n\nPergunte sobre vendas, produtos, regiões, custos, rotas, devoluções e tendências.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("Consultando data lake...");
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions =
    messages.filter(m => m.role === "assistant" && m.suggestions?.length).pop()?.suggestions ||
    DEFAULT_SUGGESTIONS;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  async function sendFeedback(msgId: string, helpful: boolean) {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || msg.role !== "assistant" || msg.feedback) return;
    
    setMessages(prev => prev.map(m => m.id === msgId ? {...m, feedback: helpful ? "helpful" : "not-helpful"} : m));
    
    await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question: messages.filter(m => m.role === "user").pop()?.content || "",
        answer: msg.content,
        engine: msg.engine,
        sql: msg.sql,
        helpful,
      }),
    }).catch(() => {});
  }

  async function sendMessage(question: string) {
    if (!question.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      content: question,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setLoadingMessage("Consultando data lake...");
    setError(null);

    const loadingStages: [number, string][] = [
      [2500, "Nenhum template exato bateu, buscando com nosso modelo de IA... 🤖"],
      [15000, "Carregando o modelo de IA na memória (pode levar até 40s)... 🧠"],
      [45000, "Estamos usando um modelo de IA ainda em fase de testes — tempo médio de resposta: 2 a 3 minutos ⏳"],
      [120000, "Ainda trabalhando nisso. Os dados já foram encontrados, falta só a IA formatar a resposta 🐢"],
      [200000, "Quase lá — modelo de testes em CPU é mais lento, mas sem custo. Últimos segundos... ⌛"],
    ];
    const stageTimers = loadingStages.map(([delay, message]) =>
      setTimeout(() => setLoadingMessage(message), delay)
    );

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Include current question in asked list for dedup
      const askedQuestions = [...messages.filter(m => m.role === "user").map(m => m.content), question];

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history, askedQuestions }),
      });

      const data = await res.json();

      if (!res.ok) {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.answer || "Erro ao processar sua pergunta.",
        };
        setMessages((prev) => [...prev, assistantMsg]);
        setError(data.error || null);
      } else {
        const assistantMsg: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.answer,
          sql: data.sql,
          data: data.data,
          engine: data.engine,
          suggestions: data.suggestions,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      }
    } catch {
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content:
          "Não foi possível conectar ao servidor. Verifique se o data lake está rodando.",
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      stageTimers.forEach(clearTimeout);
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  async function copyMessage(msg: Message) {
    await navigator.clipboard.writeText(msg.content);
    setCopiedId(msg.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 sm:py-4 space-y-3 sm:space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 text-sm ${
                msg.role === "user"
                  ? "bg-juice-500 text-white"
                  : "bg-zinc-800 text-zinc-100"
              }`}
            >
              <div
                className="text-sm leading-relaxed markdown-content"
                dangerouslySetInnerHTML={{ __html: marked.parse(msg.content) as string }}
              />
              {msg.engine && (
                <div className="flex items-center justify-between mt-1.5">
                  <div className="flex items-center gap-1">
                  {msg.engine === "template" && <FileCode className="w-3 h-3 text-emerald-400" />}
                  {msg.engine === "template+context" && <Database className="w-3 h-3 text-emerald-400" />}
                  {msg.engine === "template-low" && <FileCode className="w-3 h-3 text-amber-400" />}
                  {msg.engine === "ollama" && <Brain className="w-3 h-3 text-violet-400" />}
                  {msg.engine === "openai" && <Globe className="w-3 h-3 text-blue-400" />}
                  <span className={`text-[10px] ${
                    msg.engine === "template" ? "text-emerald-400" :
                    msg.engine === "template+context" ? "text-emerald-400" :
                    msg.engine === "template-low" ? "text-amber-400" :
                    msg.engine === "ollama" ? "text-violet-400" : "text-blue-400"
                  }`}>
                    {msg.engine === "template" ? "Template (100% determinístico)" :
                     msg.engine === "template+context" ? "Template + Contexto IA" :
                     msg.engine === "template-low" ? "Template (aproximação)" :
                     msg.engine === "ollama" ? "Ollama IA (local)" : "OpenAI"}
                  </span>
                </div>
                <button
                  onClick={() => copyMessage(msg)}
                  className="text-zinc-500 hover:text-zinc-300 transition-colors ml-2 shrink-0"
                  title="Copiar resposta"
                >
                  {copiedId === msg.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              )}
              {msg.suggestions && msg.suggestions.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] text-zinc-500 mb-1">Sugestões:</p>
                  {msg.suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      disabled={loading}
                      className="block w-full text-left text-xs text-juice-400 hover:text-juice-300 bg-zinc-700/50 hover:bg-zinc-700 rounded px-2 py-1 transition-colors disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              )}
              {(msg.engine === "ollama" || msg.engine === "template+context") && (
                <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-zinc-700/50">
                  <span className="text-[10px] text-zinc-500">Esta resposta usou IA. Foi útil?</span>
                  {msg.feedback ? (
                    <span className="text-[10px] text-zinc-500">
                      {msg.feedback === "helpful" ? "👍 Obrigado!" : "👎 Registrado para treino"}
                    </span>
                  ) : (
                    <div className="flex gap-1">
                      <button onClick={() => sendFeedback(msg.id, true)} className="text-xs px-1.5 py-0.5 rounded hover:bg-zinc-700 transition-colors" title="Útil">👍</button>
                      <button onClick={() => sendFeedback(msg.id, false)} className="text-xs px-1.5 py-0.5 rounded hover:bg-zinc-700 transition-colors" title="Não ajudou">👎</button>
                    </div>
                  )}
                </div>
              )}
              {msg.sql && (
                <details className="mt-2">
                  <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">
                    Ver SQL gerado
                  </summary>
                  <pre className="mt-1 text-xs text-zinc-500 bg-zinc-900 rounded p-2 overflow-x-auto">
                    {msg.sql}
                  </pre>
                </details>
              )}
              {msg.data && msg.data.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-zinc-400 cursor-pointer hover:text-zinc-300">
                    Ver dados ({msg.data.length} linhas)
                  </summary>
                  <div className="mt-1 text-xs text-zinc-400 bg-zinc-900 rounded p-2 overflow-x-auto max-h-40 overflow-y-auto">
                    <table className="w-full">
                      <thead>
                        <tr>
                          {Object.keys(msg.data[0]).map((key) => (
                            <th key={key} className="text-left px-1 text-zinc-500">
                              {key}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {msg.data.map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-1">
                                {String(val)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-zinc-800 rounded-2xl px-4 py-3">
              <div className="flex items-center gap-2 text-zinc-400 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                {loadingMessage}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-400/10 rounded-lg px-3 py-1.5">
              <AlertCircle className="w-3 h-3" />
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-zinc-800 p-3">
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={loading}
              className="text-[11px] bg-zinc-800/50 hover:bg-zinc-700/70 text-zinc-400 hover:text-zinc-200 rounded-full px-2.5 py-1 transition-colors disabled:opacity-50 border border-zinc-700/50"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2 mt-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre vendas, produtos, regiões..."
            className="flex-1 bg-zinc-800 rounded-xl px-3 sm:px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-juice-500/50 transition-all min-w-0"
            disabled={loading}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="bg-juice-500 hover:bg-juice-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl px-4 py-2.5 transition-colors"
          >
            <Send className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Loader2, AlertCircle, Database, FileCode, Brain, Globe } from "lucide-react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sql?: string;
  data?: Record<string, unknown>[];
  engine?: string;
  suggestions?: string[];
}

const SUGGESTED_QUESTIONS = [
  "Qual suco mais vendeu no último trimestre?",
  "Qual região teve maior crescimento em 2025?",
  "Qual categoria de suco tem melhor margem?",
  "Quais lojas venderam abaixo da média no último mês?",
  "Qual a previsão de vendas para os próximos 3 meses?",
];

export function Chat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Olá! Sou o assistente de dados da distribuidora de sucos. Funciono 100% com templates determinísticos (sem IA, sem custo). Pergunte sobre vendas, produtos, regiões, tendências.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
    setError(null);

    try {
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, history }),
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
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  }

  return (
    <div className="flex flex-col h-full max-w-4xl mx-auto">
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-juice-500 text-white"
                  : "bg-zinc-800 text-zinc-100"
              }`}
            >
              <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
              {msg.engine && (
                <div className="flex items-center gap-1 mt-1.5">
                  {msg.engine === "template" && <FileCode className="w-3 h-3 text-emerald-400" />}
                  {msg.engine === "ollama" && <Brain className="w-3 h-3 text-violet-400" />}
                  {msg.engine === "openai" && <Globe className="w-3 h-3 text-blue-400" />}
                  <span className={`text-[10px] ${
                    msg.engine === "template" ? "text-emerald-400" :
                    msg.engine === "ollama" ? "text-violet-400" : "text-blue-400"
                  }`}>
                    {msg.engine === "template" ? "Template (determinístico)" :
                     msg.engine === "ollama" ? "Ollama (local)" : "OpenAI"}
                  </span>
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
                Consultando data lake...
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

      {messages.length === 1 && (
        <div className="px-4 py-3">
          <p className="text-xs text-zinc-500 mb-2">Sugestões:</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                disabled={loading}
                className="text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-full px-3 py-1.5 transition-colors disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-zinc-600">
            <Database className="w-3 h-3" />
            Dados do data lake: PostgreSQL + MinIO via Trino
          </div>
        </div>
      )}

      <div className="border-t border-zinc-800 p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre vendas, produtos, regiões..."
            className="flex-1 bg-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:ring-2 focus:ring-juice-500/50 transition-all"
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

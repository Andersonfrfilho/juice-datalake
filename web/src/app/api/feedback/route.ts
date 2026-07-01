import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";

const LOG_FILE = path.join(process.cwd(), "feedback-log.json");

interface FeedbackEntry {
  timestamp: string;
  question: string;
  answer: string;
  engine: string;
  sql: string;
  helpful: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { question, answer, engine, sql, helpful } = body;

    if (!question || !answer) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const entry: FeedbackEntry = {
      timestamp: new Date().toISOString(),
      question,
      answer: answer.substring(0, 1000),
      engine: engine || "unknown",
      sql: sql || "",
      helpful: helpful !== false,
    };

    let log: FeedbackEntry[] = [];
    try {
      if (fs.existsSync(LOG_FILE)) {
        log = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
      }
    } catch {
      log = [];
    }

    log.push(entry);
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));

    console.log(`[Feedback] ${helpful ? '👍' : '👎'} "${question.substring(0, 60)}..." (${log.length} total)`);

    return NextResponse.json({
      success: true,
      total: log.length,
      message: helpful
        ? "Obrigado! Seu feedback ajuda a melhorar o modelo."
        : "Registrado. Esse exemplo será usado para treinar o modelo especializado da Juice.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  try {
    if (!fs.existsSync(LOG_FILE)) {
      return NextResponse.json({ total: 0, entries: [] });
    }
    const log = JSON.parse(fs.readFileSync(LOG_FILE, "utf-8"));
    const summary = {
      total: log.length,
      helpful: log.filter((e: FeedbackEntry) => e.helpful).length,
      notHelpful: log.filter((e: FeedbackEntry) => !e.helpful).length,
      recent: log.slice(-10).reverse(),
    };
    return NextResponse.json(summary);
  } catch {
    return NextResponse.json({ total: 0 });
  }
}

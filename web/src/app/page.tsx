"use client";

import { useState } from "react";
import { Chat } from "@/components/chat";
import { Dashboard } from "@/components/dashboard";
import { BarChart3, MessageCircle } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard">("chat");

  return (
    <div className="flex flex-col h-screen">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-juice-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">JD</span>
            </div>
            <h1 className="font-semibold text-lg">Juice Data Lake</h1>
          </div>
          <nav className="flex gap-1 bg-zinc-800 rounded-lg p-1">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "chat"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Dashboard
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        {activeTab === "chat" ? <Chat /> : <Dashboard />}
      </main>
    </div>
  );
}

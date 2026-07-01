"use client";

import { useState } from "react";
import { Chat } from "@/components/chat";
import { Dashboard } from "@/components/dashboard";
import { BarChart3, MessageCircle } from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"chat" | "dashboard">("chat");

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="border-b border-zinc-800 bg-zinc-900/50 backdrop-blur-xl shrink-0">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-juice-500 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs sm:text-sm">JD</span>
            </div>
            <h1 className="font-semibold text-base sm:text-lg truncate">Juice Data Lake</h1>
          </div>
          <nav className="flex gap-1 bg-zinc-800 rounded-lg p-1 shrink-0">
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "chat"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Chat</span>
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-4 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "bg-zinc-700 text-white"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Dashboard</span>
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

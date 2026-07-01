import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Juice Data Lake",
  description: "Chat com IA para análise de vendas da distribuidora de sucos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased">
        {children}
      </body>
    </html>
  );
}

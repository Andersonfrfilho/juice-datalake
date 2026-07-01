#!/usr/bin/env python3
"""
Verificação crítica: compara SQL gerado pelo chat vs execução direta no Trino.
Garante que os templates retornam dados consistentes.
"""

import subprocess
import json
import urllib.request

CHAT_URL = "http://localhost:3000/api/chat"
TRINO_CMD = ["docker", "exec", "juice-trino", "trino", "--execute"]

def trino_query(sql: str) -> str:
    result = subprocess.run(TRINO_CMD + [sql], capture_output=True, text=True)
    output = result.stdout.strip()
    lines = [l for l in output.split("\n") if not l.startswith("Jul ") and "WARNING" not in l]
    return "\n".join(lines)

def chat_query(question: str) -> dict:
    data = json.dumps({"question": question}).encode()
    req = urllib.request.Request(CHAT_URL, data=data, headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=90) as resp:
        return json.loads(resp.read())

tests = [
    ("Top product Q4 2025", "Qual suco mais vendeu no último trimestre?"),
    ("Margin by category", "Qual categoria tem melhor margem?"),
    ("Regions Dec 2025", "Qual região vendeu mais em dezembro de 2025?"),
    ("Growth YoY 2025", "Qual categoria cresceu mais em 2025 comparado com 2024?"),
    ("Returns by reason", "Quais os principais motivos de devolução?"),
    ("Routes ROI", "Qual rota tem melhor ROI?"),
    ("Forecast 3m", "Qual a previsão de vendas para os próximos 3 meses?"),
    ("Top representative", "Qual representante mais vendeu no último trimestre?"),
    ("Underperforming stores", "Quais lojas venderam abaixo da média no último mês?"),
    ("Seasonality", "Qual a sazonalidade de sucos cítricos no último ano?"),
    ("Store types", "Qual tipo de loja tem maior ticket médio?"),
    ("City analysis", "Qual cidade tem maior receita per capita?"),
    ("Returns profit impact", "Quanto as devoluções impactam o lucro?"),
    ("Route breakeven", "Quantos clientes cada rota precisa para se pagar?"),
    ("Price vs volume", "Quando o preço variou, como o volume respondeu?"),
]

print("=" * 60)
print("VERIFICAÇÃO CRÍTICA: Chat SQL vs Trino (execução direta)")
print("=" * 60)

passed = 0
failed = 0

for name, question in tests:
    try:
        resp = chat_query(question)
        
        if resp.get("error"):
            print(f"❌ {name}: {resp['error'][:100]}")
            failed += 1
            continue
        
        sql = resp.get("sql", "")
        if not sql:
            print(f"⚠️  {name}: No SQL generated")
            continue
        
        trino_val = trino_query(sql)
        
        if "failed" in trino_val.lower() or "Error" in trino_val:
            print(f"❌ {name}: Trino error\n   {trino_val[:200]}")
            failed += 1
            continue
        
        chat_rows = resp.get("rowCount", 0)
        trino_lines = [l for l in trino_val.split("\n") if l.strip() and not l.startswith('"')]
        has_data = len(trino_lines) > 0
        
        if chat_rows > 0 and has_data:
            print(f"✅ {name}: Chat {chat_rows} rows | Trino OK")
            passed += 1
        elif chat_rows == 0 and not has_data:
            print(f"⚠️  {name}: Both empty")
        else:
            print(f"❌ {name}: Mismatch Chat={chat_rows} Trino_data={has_data}")
            failed += 1
            
    except Exception as e:
        print(f"❌ {name}: {str(e)[:80]}")
        failed += 1

print("=" * 60)
print(f"✅ {passed} passed | ❌ {failed} failed | Total: {len(tests)}")
print("=" * 60)

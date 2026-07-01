#!/usr/bin/env python3
"""
Prepara dataset de fine-tuning a partir do feedback-log.json e templates.
Gera arquivos em training_data/ para uso com Unsloth/LoRA.
"""

import json
import os
import re
import sys

def prepare_dataset():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    web_dir = os.path.dirname(base_dir)
    
    # 1. Carregar feedback
    feedback_path = os.path.join(web_dir, "feedback-log.json")
    feedback = []
    if os.path.exists(feedback_path):
        with open(feedback_path) as f:
            feedback = json.load(f)
        print(f"📋 {len(feedback)} entradas de feedback carregadas")
    else:
        print("⚠️  feedback-log.json não encontrado — pulando exemplos de feedback")
    
    # 2. Carregar templates
    templates_path = os.path.join(web_dir, "src/lib/question-templates.ts")
    with open(templates_path) as f:
        templates_ts = f.read()
    
    desc_matches = re.findall(r'description:\s*"([^"]+)"', templates_ts)
    example_matches = re.findall(r'example:\s*"([^"]+)"', templates_ts)
    category_matches = re.findall(r'category:\s*"([^"]+)"', templates_ts)
    
    print(f"📋 {len(desc_matches)} templates encontrados")
    
    dataset = []
    
    # 3. Templates → exemplos de alta qualidade
    for i, (desc, example) in enumerate(zip(desc_matches, example_matches)):
        cat = category_matches[i] if i < len(category_matches) else "Geral"
        dataset.append({
            "instruction": example,
            "input": "",
            "output": f"[Resposta para: {desc}] Dados do data lake consultados via Trino. Categoria: {cat}.",
            "source": "template",
            "category": cat,
        })
    
    # 4. Feedback positivo → exemplos bons
    positive = [e for e in feedback if e.get("helpful")]
    for entry in positive:
        dataset.append({
            "instruction": entry["question"],
            "input": "",
            "output": entry["answer"].split("---")[0].strip(),
            "source": "feedback-positive",
        })
    print(f"✅ {len(positive)} feedbacks positivos")
    
    # 5. Feedback negativo → marcar para revisão manual
    negative = [e for e in feedback if not e.get("helpful")]
    for entry in negative:
        dataset.append({
            "instruction": entry["question"],
            "input": "",
            "output": f"⚠️ REVISAR: {entry['answer'][:200]}",
            "source": "feedback-negative-needs-review",
        })
    
    if negative:
        print(f"⚠️  {len(negative)} feedbacks negativos — precisam de revisão manual em training_data/dataset.json")
    
    # 6. Benchmarks fixos (conhecimento de domínio)
    benchmarks = [
        ("Qual a margem bruta esperada para distribuidoras de sucos no Brasil em 2026?",
         "A margem bruta média no setor de distribuição de bebidas do Brasil em 2026 é de 35-45%. Categorias premium (orgânicos, detox) podem atingir 50-55%. Margens acima de 55% indicam excelente precificação e baixo custo de produção."),
        ("Qual a taxa de devolução aceitável para o setor de bebidas?",
         "A taxa de devolução aceitável no setor de distribuição de bebidas é de 2-5% do faturamento. Taxas acima de 5% indicam problemas de qualidade do produto, logística inadequada ou práticas de venda agressivas. Devoluções por 'produto danificado' acima de 25% do total sugerem problemas na embalagem ou transporte."),
        ("Qual o crescimento esperado para o mercado de sucos no Brasil em 2026?",
         "O mercado brasileiro de sucos naturais e funcionais projeta crescimento de 8-12% em 2026, puxado por categorias premium (15-20%) e zero açúcar (12-18%). Sucos tradicionais devem crescer 5-8%. O mercado total de bebidas não alcoólicas cresce 6-9%."),
        ("Qual o custo logístico ideal para uma distribuidora de bebidas?",
         "O custo logístico ideal para distribuidoras de bebidas é de 5-8% da receita bruta. Rotas acima de 200km ou com densidade menor que 5 clientes por dia tendem a exceder esse limite. O custo por km rodado ideal é de R$ 3-5 em 2026."),
        ("Qual o investimento recomendado em marketing para cada categoria de suco?",
         "O investimento em marketing recomendado é de 15-18% da receita para categorias premium (orgânicos, detox), 12-15% para cítricos e tropicais, 8-10% para tradicionais, e 5-8% para light/zero. O ROAS (retorno sobre investimento em marketing) saudável é de 3:1 a 5:1."),
        ("Quais categorias de suco estão em alta no mercado brasileiro em 2026?",
         "Em 2026, as categorias em alta no Brasil são: premium/orgânicos (+15-20%), funcionais/detox (+18-22%), zero açúcar (+12-18%) e água de coco (+10-15%). Categorias estáveis: tradicionais (laranja, uva) com +5-8%. Em declínio: néctares artificiais (-3-5%) e refrescos em pó (-8-12%)."),
        ("Qual o ticket médio esperado para distribuidoras de bebidas por região do Brasil?",
         "Ticket médio por região em 2026: Sudeste R$ 200-450, Sul R$ 180-400, Nordeste R$ 120-300, Centro-Oeste R$ 150-350, Norte R$ 100-280. A variação reflete poder aquisitivo regional e densidade de lojas."),
    ]
    
    for q, a in benchmarks:
        dataset.append({"instruction": q, "input": "", "output": a, "source": "benchmark"})
    
    print(f"📊 {len(benchmarks)} benchmarks de mercado adicionados")
    
    # 7. Salvar datasets
    out_dir = os.path.join(web_dir, "training_data")
    os.makedirs(out_dir, exist_ok=True)
    
    # Formato completo (para revisão)
    with open(os.path.join(out_dir, "dataset.json"), "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)
    
    # Formato Unsloth (instruction, input, output por linha)
    with open(os.path.join(out_dir, "dataset_unsloth.jsonl"), "w", encoding="utf-8") as f:
        for d in dataset:
            if "negative" not in d["source"]:
                f.write(json.dumps({
                    "instruction": d["instruction"],
                    "input": d["input"],
                    "output": d["output"]
                }, ensure_ascii=False) + "\n")
    
    # Estatísticas
    total = len(dataset)
    usable = sum(1 for d in dataset if "negative" not in d["source"])
    
    print(f"\n{'='*50}")
    print(f"📦 Dataset gerado em: {out_dir}/")
    print(f"   dataset.json          → {total} exemplos (completo, para revisão)")
    print(f"   dataset_unsloth.jsonl → {usable} exemplos (pronto para Unsloth)")
    print(f"\n📊 Composição:")
    print(f"   Templates:     {len(desc_matches)}")
    print(f"   Feedback 👍:   {len(positive)}")
    print(f"   Feedback 👎:   {len(negative)} (revisar antes de treinar)")
    print(f"   Benchmarks:    {len(benchmarks)}")
    print(f"\n⚠️  Revise os {len(negative)} exemplos negativos em dataset.json")
    print(f"   antes de executar o fine-tuning.")
    print(f"{'='*50}")

if __name__ == "__main__":
    prepare_dataset()

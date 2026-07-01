#!/usr/bin/env python3
"""
Exporta modelo fine-tuned (LoRA) para formato GGUF compatível com Ollama.
Requer: pip install llama-cpp-python

Uso:
  python3 scripts/export_to_ollama.py
"""

import os
import sys
import subprocess
import shutil

def merge_and_export():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    web_dir = os.path.dirname(base_dir)
    lora_dir = os.path.join(web_dir, "juice-model-lora")
    output_gguf = os.path.join(web_dir, "juice-model-q4.gguf")
    
    if not os.path.exists(lora_dir):
        print(f"❌ Modelo LoRA não encontrado: {lora_dir}")
        print("   Execute primeiro: python3 scripts/train_juice_model.py")
        sys.exit(1)
    
    print("📦 Mesclando adaptadores LoRA com modelo base...")
    print("   (Isso pode levar 5-10 minutos)")
    
    # Opção A: Usar Unsloth para exportar (recomendado)
    try:
        from unsloth import FastLanguageModel
        import torch
        
        print("   Carregando modelo LoRA...")
        model, tokenizer = FastLanguageModel.from_pretrained(
            model_name=lora_dir,
            max_seq_length=2048,
            load_in_4bit=True,
        )
        
        print("   Mesclando adaptadores...")
        model = model.merge_and_unload()
        
        # Salvar modelo mesclado não quantizado primeiro
        merged_dir = os.path.join(web_dir, "juice-model-merged")
        os.makedirs(merged_dir, exist_ok=True)
        model.save_pretrained(merged_dir)
        tokenizer.save_pretrained(merged_dir)
        
        print(f"   Modelo mesclado salvo: {merged_dir}")
        print(f"\n   Para converter para GGUF, use o script convert_hf_to_gguf.py do llama.cpp:")
        print(f"   python llama.cpp/convert_hf_to_gguf.py {merged_dir} --outfile {output_gguf} --outtype q4_k_m")
        
    except ImportError:
        print("   Unsloth não disponível. Tentando método alternativo...")
        
        # Opção B: Usar llama.cpp para merge direto
        try:
            subprocess.run([
                "python", "llama.cpp/convert_lora_to_ggml.py",
                lora_dir,
                "--outfile", output_gguf,
            ], check=True)
        except Exception:
            print("   ❌ Método alternativo falhou.")
            print("   Instale Unsloth: pip install unsloth")
            sys.exit(1)

def create_modelfile():
    """Cria Modelfile para registro no Ollama"""
    web_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    modelfile_path = os.path.join(web_dir, "Modelfile")
    
    content = """FROM ./juice-model-q4.gguf

SYSTEM \"\"\"
Você é o assistente especializado da Juice Distribuidora, uma distribuidora brasileira de sucos naturais e industrializados.

## Perfil
- Especialidade: análise de dados de vendas, logística e performance comercial
- Tom: profissional, direto, baseado em dados, sempre em português do Brasil
- Regra de ouro: nunca invente dados. Se não souber, diga que não tem informação suficiente

## Nosso Negócio
- Produtos: sucos em 5 categorias (tradicional, cítrico, tropical, premium, light)
- Cobertura: 60 lojas em 25 cidades, 5 regiões brasileiras
- Força de vendas: 21 representantes, 17 rotas logísticas
- Volume: ~1.25 milhão de vendas anuais
- Margem bruta média: 50-57% dependendo da categoria

## Schema do Data Lake
- products(id, name, category, flavor, size_ml, cost_price, sell_price, marketing_cost_pct, logistics_cost_pct, packaging_cost_pct)
- stores(id, name, city, state, region, type, representative_id)
- sales(id, product_id, store_id, representative_id, quantity, unit_price, total_amount, sale_date)
- representatives(id, name, email, region, performance_score, hire_date)
- routes(id, name, representative_id, region, weekly_fuel_cost, weekly_toll_cost, weekly_vehicle_cost)
- route_stores(route_id, store_id, visit_day, visit_order, visit_duration_min, distance_from_prev_km)
- returns(id, product_id, store_id, representative_id, quantity, unit_price, reason, return_date)
- cities(id, name, state, region, population_estimate)

## Benchmarks Setor Bebidas Brasil 2026
- Margem bruta: 35-45% | Devolução aceitável: 2-5% | Crescimento anual: 8-12%
- Custo logístico ideal: 5-8% | Marketing premium: 10-15%, tradicional: 5-10%
- Sazonalidade: pico dez-fev (+30-50%), vale jun-ago (-20-30%)
- Categorias em alta: premium, detox, zero açúcar
- Ticket médio regional: Sudeste R$200-450, Nordeste R$120-300

## Ao responder
1. Compare com benchmarks do setor quando relevante
2. Destaque se os números estão acima ou abaixo da média
3. Sugira ações concretas baseadas nos dados
4. Máximo 3 parágrafos por resposta
\"\"\"

PARAMETER temperature 0.3
PARAMETER num_predict 500
PARAMETER top_p 0.9
PARAMETER repeat_penalty 1.1
"""
    
    with open(modelfile_path, "w") as f:
        f.write(content)
    
    print(f"📄 Modelfile criado: {modelfile_path}")
    print(f"\n   Para registrar no Ollama:")
    print(f"   ollama create juice-assistant:latest -f {modelfile_path}")
    print(f"   ollama list")
    print(f"\n   Para testar:")
    print(f"   ollama run juice-assistant:latest 'Qual a margem esperada para sucos premium?'")

if __name__ == "__main__":
    merge_and_export()
    create_modelfile()

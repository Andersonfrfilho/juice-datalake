#!/usr/bin/env python3
"""
Fine-tuning do modelo Juice Assistant usando Unsloth + LoRA.
Requer: pip install unsloth torch transformers datasets accelerate peft

Uso:
  python3 scripts/train_juice_model.py

Pré-requisitos:
  - GPU NVIDIA ≥8GB VRAM ou Apple Silicon M2+ ≥16GB
  - Dataset gerado via scripts/prepare_dataset.py
"""

import os
import sys
import json

def check_requirements():
    try:
        import torch
        import unsloth
        from datasets import load_dataset
        print(f"✅ PyTorch {torch.__version__}")
        print(f"✅ Unsloth instalado")
    except ImportError as e:
        print(f"❌ Dependência faltando: {e}")
        print("   Instale: pip install unsloth torch transformers datasets accelerate peft")
        sys.exit(1)

def setup_paths():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    web_dir = os.path.dirname(base_dir)
    dataset_path = os.path.join(web_dir, "training_data", "dataset_unsloth.jsonl")
    
    if not os.path.exists(dataset_path):
        print(f"❌ Dataset não encontrado: {dataset_path}")
        print("   Execute primeiro: python3 scripts/prepare_dataset.py")
        sys.exit(1)
    
    return web_dir, dataset_path

def train():
    check_requirements()
    web_dir, dataset_path = setup_paths()
    
    # ═══════════════════════════════════════
    # Configurações de treino (modifique aqui)
    # ═══════════════════════════════════════
    
    MODEL_NAME = "unsloth/Qwen2.5-3B-Instruct-bnb-4bit"
    MAX_SEQ_LENGTH = 2048
    LORA_RANK = 16
    LORA_ALPHA = 16
    LORA_DROPOUT = 0.05
    LEARNING_RATE = 2e-4
    MAX_STEPS = 100
    BATCH_SIZE = 2
    GRAD_ACCUM = 4
    OUTPUT_DIR = os.path.join(web_dir, "juice-model-lora")
    
    import torch
    from unsloth import FastLanguageModel
    from datasets import load_dataset
    from transformers import TrainingArguments
    from trl import SFTTrainer
    
    # 1. Carregar modelo base quantizado (4-bit = cabe em GPU de 8GB)
    print(f"\n📦 Carregando modelo base: {MODEL_NAME}")
    model, tokenizer = FastLanguageModel.from_pretrained(
        model_name=MODEL_NAME,
        max_seq_length=MAX_SEQ_LENGTH,
        load_in_4bit=True,
        dtype=torch.float16,
    )
    
    # 2. Adicionar adaptadores LoRA (treina só 1% dos parâmetros)
    print("🔧 Configurando adaptadores LoRA...")
    model = FastLanguageModel.get_peft_model(
        model,
        r=LORA_RANK,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                       "gate_proj", "up_proj", "down_proj"],
        lora_alpha=LORA_ALPHA,
        lora_dropout=LORA_DROPOUT,
        bias="none",
        use_gradient_checkpointing=True,
    )
    
    # 3. Formatar dataset no padrão de chat do Qwen
    def format_chat(examples):
        texts = []
        for instruction, output in zip(examples["instruction"], examples["output"]):
            text = f"""<|system|>
Você é o assistente especializado da Juice Distribuidora, uma distribuidora brasileira de sucos naturais. Responda sempre em português do Brasil, com dados precisos. Compare com benchmarks do setor de bebidas 2026 quando relevante. Não invente dados. Seja conciso (máximo 3 parágrafos). Use tom profissional e direto.
<|user|>
{instruction}
<|assistant|>
{output}"""
            texts.append(text)
        return {"text": texts}
    
    print(f"📊 Carregando dataset: {dataset_path}")
    dataset = load_dataset("json", data_files=dataset_path, split="train")
    dataset = dataset.map(format_chat, batched=True)
    print(f"   {len(dataset)} exemplos carregados")
    
    # 4. Configurar treinador
    print(f"\n🚀 Iniciando fine-tuning ({MAX_STEPS} steps)...")
    trainer = SFTTrainer(
        model=model,
        tokenizer=tokenizer,
        train_dataset=dataset,
        max_seq_length=MAX_SEQ_LENGTH,
        dataset_text_field="text",
        args=TrainingArguments(
            output_dir=OUTPUT_DIR,
            per_device_train_batch_size=BATCH_SIZE,
            gradient_accumulation_steps=GRAD_ACCUM,
            warmup_steps=5,
            max_steps=MAX_STEPS,
            learning_rate=LEARNING_RATE,
            fp16=not torch.backends.mps.is_available(),
            logging_steps=10,
            save_steps=50,
            optim="adamw_8bit",
            seed=42,
            report_to="none",
        ),
    )
    
    trainer.train()
    
    # 5. Salvar modelo treinado
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    model.save_pretrained(OUTPUT_DIR)
    tokenizer.save_pretrained(OUTPUT_DIR)
    
    print(f"\n{'='*50}")
    print(f"✅ Fine-tuning concluído!")
    print(f"   Modelo salvo: {OUTPUT_DIR}")
    print(f"   Próximo passo: python3 scripts/export_to_ollama.py")
    print(f"{'='*50}")

if __name__ == "__main__":
    train()

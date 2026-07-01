# Juice Data Lake

Plataforma de data lake para distribuidora de sucos com chat IA para consultas de negócio.

## Stack

- **PostgreSQL 16** — banco transacional (vendas, produtos, lojas)
- **MinIO** — armazenamento S3-compatible (data lake)
- **Trino 462** — query engine federado (consulta PostgreSQL + MinIO)
- **Hive Metastore** — catálogo de dados
- **Next.js 14** — interface web com chat IA e dashboard
- **OpenAI** — tradução de linguagem natural para SQL
- **Docker** — ambiente local completo

## Quick Start (Local)

```bash
# 1. Subir infraestrutura
docker compose -f docker/docker-compose.yml up -d

# 2. Gerar dados sintéticos
cd data-generator && npm install && npm run generate

# 3. Iniciar aplicação web
cd ../web && npm install && cp .env.example .env
# Edite .env com sua OPENAI_API_KEY
npm run dev

# 4. Acessar
open http://localhost:3000
```

## Estrutura do Projeto

```
juice-datalake/
├── .specs/                    # Documentação técnica (spec, design)
├── docs/
│   ├── BUSINESS_QUESTIONS.md  # Perguntas de negócio por time
│   └── DATALAKE_EXPLAINED.md  # Como data lakes funcionam
├── docker/                    # Docker Compose + configs
│   ├── docker-compose.yml
│   ├── postgres/init.sql
│   ├── trino/etc/
│   └── hive/conf/
├── data-generator/            # Gerador de dados sintéticos
│   └── src/
│       ├── generate.ts        # Entry point
│       ├── db.ts              # PostgreSQL + MinIO helpers
│       ├── export.ts          # Exportação Parquet
│       └── seeds/             # Dados de produtos, lojas
├── web/                       # Aplicação Next.js
│   └── src/
│       ├── app/
│       │   ├── api/chat/      # Chat API (NL → SQL → Trino)
│       │   ├── api/dashboard/  # Dashboard API (KPIs)
│       │   └── page.tsx       # Página principal
│       ├── components/
│       │   ├── chat.tsx       # Interface de chat
│       │   └── dashboard.tsx  # Dashboard com gráficos
│       └── lib/
│           ├── trino.ts       # Cliente Trino
│           └── nl-to-sql.ts   # Tradutor NL → SQL
└── railway.json               # Deploy Railway
```

## Perguntas que o Chat Responde

- Qual suco está vendendo mais? (por receita, volume, região)
- Qual sabor está crescendo mais?
- Qual região performa melhor?
- Onde devemos abrir a próxima loja?
- Qual a sazonalidade de cada categoria?
- Previsão de vendas para próximos 3 meses
- Em qual suco devemos investir mais?
- E mais 14 perguntas documentadas em [BUSINESS_QUESTIONS.md](docs/BUSINESS_QUESTIONS.md)

## Modos do Chat (sem dependência de API paga)

O chat funciona com **3 engines em cascata**:

| Engine    | Custo  | Internet | Como ativar                             | Ícone          |
| --------- | ------ | -------- | --------------------------------------- | -------------- |
| Templates | Grátis | Não      | **Sempre ativo** (padrão)               | FileCode verde |
| Ollama    | Grátis | Não      | Descomentar `ollama` no docker-compose  | Brain violeta  |
| OpenAI    | Pago   | Sim      | `OPENAI_API_KEY` no `.env`              | Globe azul     |

**Pipeline:** Template match → se falhar → Ollama local → se falhar → OpenAI remoto

O sistema de templates cobre ~90% das perguntas com 100% de precisão (zero alucinação).

## Deploy no Railway

```bash
npm i -g @railway/cli
railway login
cd web && railway up
```

Guia completo: [docs/RAILWAY_DEPLOY.md](docs/RAILWAY_DEPLOY.md)

| Recurso | Tier Gratuito | Developer ($5/mês) |
|---------|--------------|---------------------|
| Next.js | 512MB | 2GB |
| PostgreSQL | 1GB | 2GB |
| Ollama (IA) | ❌ Não cabe | +$5 (4GB) |

## Tecnologias

| Camada             | Local              | Railway            |
| ------------------ | ------------------ | ------------------ |
| Transacional       | PostgreSQL Docker  | Railway PostgreSQL |
| Data Lake Storage  | MinIO Docker       | — (embed)          |
| Query Engine       | Trino Docker       | DuckDB embedded    |
| Catálogo           | Hive Metastore     | —                  |
| Frontend           | Next.js dev        | Next.js production |
| IA                 | OpenAI API         | OpenAI API         |

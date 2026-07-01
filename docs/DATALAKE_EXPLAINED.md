# Como Data Lakes Funcionam

## O que é um Data Lake?

Um **data lake** (lago de dados) é um repositório centralizado que armazena dados brutos no seu formato nativo — estruturados (tabelas de banco), semiestruturados (JSON, XML, logs) e não estruturados (imagens, PDFs). Diferente de um data warehouse tradicional que exige dados limpos e modelados antes de entrar, o data lake segue o princípio **schema-on-read**: você armazena tudo primeiro e define a estrutura quando consulta.

```
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│  PostgreSQL  │   │  APIs/CSVs   │   │    IoT/Logs   │
│(Transacional)│   │  (Externos)  │   │  (Streaming)  │
└──────┬───────┘   └──────┬───────┘   └──────┬───────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          ▼
              ┌───────────────────────┐
              │    DATA LAKE (MinIO)  │
              │  Parquet / Iceberg    │
              │  Particionado por data│
              └───────────┬───────────┘
                          │
              ┌───────────▼───────────┐
              │    QUERY ENGINE       │
              │    (Trino / Spark)    │
              │  Consultas Federadas  │
              └───────────┬───────────┘
                          │
              ┌───────────▼───────────┐
              │    APLICAÇÕES         │
              │  Dashboards / IA / ML │
              └───────────────────────┘
```

## Sim, data lakes se conectam em bancos de dados

A resposta curta: **Sim, e essa é uma das principais funcionalidades.**

Um data lake completo usa um **query engine federado** (como **Trino**) que se conecta simultaneamente a:

1. **Bancos transacionais** (PostgreSQL, MySQL, Oracle) — dados ao vivo
2. **Armazenamento de objetos** (MinIO/S3) — dados históricos em Parquet
3. **APIs externas** — dados de mercado, clima, etc.

O Trino faz o papel de "tradutor universal": ele apresenta todas essas fontes como se fossem tabelas de um único banco de dados, permitindo JOINs entre fontes diferentes em uma única query.

### Exemplo real de query federada

Imagine que você tem:
- Tabela `products` no **PostgreSQL** (dados sempre atualizados)
- Tabela `sales` em **Parquet no MinIO** (dados históricos, 2 anos)

Uma única query no Trino junta as duas:

```sql
-- Trino consulta PostgreSQL (products) E MinIO (sales) na mesma query
SELECT p.name,
       SUM(s.total_amount) as revenue,
       COUNT(*) as transactions
FROM hive.datalake.sales s          -- lê Parquet do MinIO
JOIN postgresql.public.products p   -- lê do PostgreSQL
  ON s.product_id = p.id
WHERE s.sale_date >= DATE_ADD('month', -3, CURRENT_DATE)
GROUP BY p.name
ORDER BY revenue DESC
LIMIT 10;
```

Isso é o que permite responder "qual suco mais vendeu no último trimestre?" — o Trino pega os dados de vendas do MinIO, as informações de produto do PostgreSQL, junta tudo e retorna o resultado.

## Por que usar Parquet em vez de CSV/JSON?

| Formato  | Compressão | Velocidade       | Schema         |
| -------- | ---------- | ---------------- | -------------- |
| CSV      | 1x         | Lento (row-based)| Nenhum         |
| JSON     | 1x         | Lento            | Implícito      |
| Parquet  | 5-10x      | Rápido (colunar) | Embutido       |
| Iceberg  | 5-10x      | Rápido + ACID    | Embutido       |

**Parquet** é o formato padrão de data lakes porque:
- É **colunar**: lê apenas as colunas necessárias (ex: numa query de SUM(total_amount), ignora quantity, unit_price)
- Comprime **5-10x** mais que CSV
- Tem schema embutido (não precisa inferir tipos)
- Particionamento por diretórios (year=2024/month=01/data.parquet) permite "prune" — pular partições irrelevantes

## Fluxo de dados no Juice Data Lake

```
1. GERAÇÃO (data-generator)
   ├── Gera 30 produtos, 60 lojas, 2 anos de vendas
   ├── Insere no PostgreSQL (transacional)
   └── Exporta Parquet para MinIO (data lake)

2. CONSULTA (Next.js + Trino)
   ├── Usuário pergunta no chat
   ├── IA traduz pergunta → SQL federado
   ├── Trino executa query (PostgreSQL + MinIO)
   └── Resposta formatada em linguagem natural
```

## Comparação: Com vs Sem Data Lake

### Sem Data Lake (abordagem tradicional)
```
Analista recebe pergunta
  → Abre PostgreSQL, exporta CSV
  → Abre Excel, abre outro CSV de dados históricos
  → Faz VLOOKUP manual
  → Cria gráfico
  → Manda por email (2 dias depois)
```

### Com Data Lake (Juice Data Lake)
```
Gerente digita pergunta no chat
  → IA traduz para SQL
  → Trino consulta PostgreSQL + MinIO
  → Resposta em 3 segundos
```

## Stack deste Projeto

| Componente         | Local (Docker)      | Railway (Produção)     |
| ------------------ | ------------------- | ---------------------- |
| Banco Transacional | PostgreSQL 16       | Railway PostgreSQL     |
| Armazenamento      | MinIO (S3-compat)   | DuckDB + PG            |
| Query Engine       | Trino 462           | DuckDB (embedded)      |
| Catálogo           | Hive Metastore      | N/A (DuckDB)           |
| Chat IA            | Next.js + OpenAI    | Next.js + OpenAI       |

**Nota sobre Railway**: Por limitações de recursos no tier gratuito, o deploy no Railway substitui Trino+MinIO por DuckDB embedded no Node.js. O DuckDB consegue consultar PostgreSQL via `postgres_scanner` e também ler/escrever Parquet, mantendo o conceito de data lake (consultas analíticas) de forma mais leve. A experiência local com Docker demonstra o stack enterprise completo.

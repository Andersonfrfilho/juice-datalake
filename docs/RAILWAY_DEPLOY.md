# Deploy no Railway

Guia para deploy da plataforma Juice Data Lake no [Railway](https://railway.app).

## Arquitetura Railway vs Local

| Componente | Local (Docker) | Railway |
|-----------|---------------|---------|
| PostgreSQL | Container Docker | Railway Managed DB |
| MinIO (S3) | Container Docker | Railway Volume ou skip |
| Trino | Container Docker | Skip (substituído por queries diretas) |
| Ollama (IA) | Container Docker | Serviço separado ou skip |
| Next.js | Dev server | Produção (standalone) |
| Dados | Gerados localmente | Restaurados de dump |

**Estratégia Railway**: simplificar o stack. O Next.js consulta PostgreSQL direto via `pg` (sem Trino), mantendo os templates e o chat. É uma demonstração funcional do data lake — os conceitos e dados são os mesmos, só o query engine é simplificado.

## Passo 1: Preparar o Projeto

### 1.1 Instalar Railway CLI

```bash
npm i -g @railway/cli
railway login
```

### 1.2 Criar projeto no Railway

```bash
railway init
# ou via dashboard: https://railway.app/new
```

### 1.3 Estrutura de serviços (`railway.json`)

O arquivo `railway.json` na raiz do projeto define os serviços:

```json
{
  "$schema": "https://railway.com/railway.schema.json",
  "build": {
    "builder": "DOCKERFILE",
    "dockerfilePath": "./web/Dockerfile"
  },
  "deploy": {
    "numReplicas": 1,
    "startCommand": "node server.js",
    "healthcheckPath": "/",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

## Passo 2: Configurar PostgreSQL no Railway

### 2.1 Provisionar banco

No dashboard Railway:
1. New → Database → PostgreSQL
2. Anote a `DATABASE_URL` (será injetada como variável de ambiente)

### 2.2 Criar schema

Conecte ao banco Railway e execute o schema:

```bash
railway connect postgres
```

```sql
CREATE TABLE representatives (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100), phone VARCHAR(20),
    region VARCHAR(20) NOT NULL,
    performance_score DECIMAL(3,1) DEFAULT 3.0,
    hire_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    flavor VARCHAR(50) NOT NULL,
    size_ml INT NOT NULL,
    cost_price DECIMAL(10,2) NOT NULL,
    sell_price DECIMAL(10,2) NOT NULL,
    marketing_cost_pct DECIMAL(4,1) DEFAULT 10.0,
    logistics_cost_pct DECIMAL(4,1) DEFAULT 8.0,
    packaging_cost_pct DECIMAL(4,1) DEFAULT 5.0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE stores (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state CHAR(2) NOT NULL,
    region VARCHAR(20) NOT NULL,
    type VARCHAR(20) NOT NULL,
    representative_id INT REFERENCES representatives(id),
    opened_at DATE NOT NULL
);

CREATE TABLE sales (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id),
    store_id INT NOT NULL REFERENCES stores(id),
    representative_id INT REFERENCES representatives(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    sale_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE returns (
    id SERIAL PRIMARY KEY,
    product_id INT NOT NULL REFERENCES products(id),
    store_id INT NOT NULL REFERENCES stores(id),
    representative_id INT REFERENCES representatives(id),
    quantity INT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    reason VARCHAR(30) NOT NULL,
    return_date DATE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE routes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    representative_id INT REFERENCES representatives(id),
    region VARCHAR(20) NOT NULL,
    weekly_fuel_cost DECIMAL(10,2) NOT NULL,
    weekly_toll_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    weekly_vehicle_cost DECIMAL(10,2) NOT NULL DEFAULT 0,
    weekly_distance_km INT NOT NULL DEFAULT 0,
    total_weekly_cost DECIMAL(10,2) GENERATED ALWAYS AS (weekly_fuel_cost + weekly_toll_cost + weekly_vehicle_cost) STORED,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE route_stores (
    id SERIAL PRIMARY KEY,
    route_id INT REFERENCES routes(id) ON DELETE CASCADE,
    store_id INT REFERENCES stores(id) ON DELETE CASCADE,
    visit_day VARCHAR(10) NOT NULL,
    visit_order INT DEFAULT 1,
    visit_duration_min INT DEFAULT 30,
    distance_from_prev_km DECIMAL(5,1) DEFAULT 0,
    UNIQUE(route_id, store_id)
);

CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    state CHAR(2) NOT NULL,
    region VARCHAR(20) NOT NULL,
    population_estimate INT,
    UNIQUE(name, state)
);

-- Índices
CREATE INDEX idx_sales_sale_date ON sales(sale_date);
CREATE INDEX idx_sales_product_id ON sales(product_id);
CREATE INDEX idx_sales_store_id ON sales(store_id);
CREATE INDEX idx_sales_representative_id ON sales(representative_id);
CREATE INDEX idx_returns_date ON returns(return_date);
CREATE INDEX idx_routes_representative ON routes(representative_id);
```

### 2.3 Popular dados

Gere os dados localmente e exporte:

```bash
# Local: gerar dados
cd data-generator && npm run generate

# Exportar para CSV (ou usar o script abaixo)
docker exec juice-postgres psql -U jadmin -d juicedb -c "\copy (SELECT * FROM representatives) TO '/tmp/reps.csv' CSV HEADER"
# ... repetir para cada tabela

# Importar no Railway
railway connect postgres
\copy representatives FROM 'reps.csv' CSV HEADER
```

**Alternativa**: script Node.js que popula o banco Railway via `DATABASE_URL`:

```bash
# No diretório data-generator
DATABASE_URL=$RAILWAY_DATABASE_URL npm run generate
```

## Passo 3: Deploy da Aplicação Next.js

### 3.1 Dockerfile (já existe em `web/Dockerfile`)

```dockerfile
FROM node:20-alpine AS base
FROM base AS deps
RUN apk add --no-cache libc6-compat python3 make g++
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --production=false

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
ENV PORT=3000
CMD ["node", "server.js"]
```

### 3.2 Deploy

```bash
cd web
railway up
```

### 3.3 Variáveis de ambiente

Copie o conteúdo de `.env.railway` no dashboard Railway (Settings → Shared Variables):

| Variável | Serviço | Obrigatória | Descrição |
|----------|---------|-------------|-----------|
| `DATABASE_URL` | PostgreSQL | ✅ | Railway injeta automaticamente |
| `NODE_ENV` | Next.js | ✅ | `production` |
| `PORT` | Next.js | ✅ | `3000` |
| `OLLAMA_URL` | Next.js | ❌ | Se tiver serviço Ollama separado |
| `OLLAMA_MODEL` | Next.js | ❌ | `qwen2.5:3b` |
| `OPENAI_API_KEY` | Next.js | ❌ | Fallback remoto opcional |

**Nota**: `DATABASE_URL` é injetada automaticamente quando você vincula o serviço PostgreSQL ao Next.js no dashboard Railway.

### 3.4 Migrations automáticas no deploy

O `startCommand` já inclui `node scripts/migrate.js` antes de iniciar o servidor. As migrations rodam a cada deploy e são idempotentes (não quebram se já executadas).

```toml
# railway.toml
[deploy]
startCommand = "node scripts/migrate.js && node server.js"
```

## Passo 4: (Opcional) Deploy do Ollama no Railway

Se quiser manter a IA local, adicione um serviço Ollama:

### 4.1 railway.json adicional

```json
{
  "services": {
    "ollama": {
      "image": "ollama/ollama:latest",
      "healthcheckPath": "/api/tags",
      "volumes": ["ollama_data:/root/.ollama"],
      "deploy": {
        "startCommand": "ollama serve & sleep 5 && ollama pull qwen2.5:3b && tail -f /dev/null"
      }
    }
  }
}
```

**Nota**: Ollama precisa de ≥4GB RAM. No tier gratuito do Railway (512MB), NÃO funciona. Use o tier Developer ($5/mês).

## Passo 5: Verificar Deploy

```bash
# Abrir no navegador
railway open

# Ver logs
railway logs

# Healthcheck
curl https://seu-app.railway.app/
# Esperado: 200 OK

# Testar API
curl -X POST https://seu-app.railway.app/api/chat \
  -H 'Content-Type: application/json' \
  -d '{"question":"Qual suco mais vendeu?"}'
```

## Passo 6: Domínio Customizado (Opcional)

No dashboard Railway:
1. Settings → Domains → Generate Domain
2. Ou configure seu domínio: `datalake.suadistribuidora.com.br`

## Troubleshooting

### Erro: `DATABASE_URL` não encontrada
O Railway injeta `DATABASE_URL` automaticamente. Verifique se o serviço PostgreSQL está linkado ao serviço Next.js no dashboard.

### Erro: Build falha por memória
Adicione no `package.json`:
```json
"build": "NODE_OPTIONS='--max-old-space-size=512' next build"
```

### Erro: Timeout nas queries
O tier gratuito do Railway PostgreSQL tem 1GB RAM e pode ser lento com 1.2M registros. Soluções:
- Reduza o volume de dados (6 meses em vez de 2 anos)
- Faça upgrade para o tier Developer ($5/mês, 2GB RAM)

### Erro: Tabela não encontrada
Execute o script de schema (Passo 2.2) antes de popular dados.

## Custos Estimados (Railway)

| Recurso | Tier Gratuito | Developer ($5/mês) |
|---------|--------------|---------------------|
| Next.js | 512MB RAM, 1GB disco | 2GB RAM, 10GB disco |
| PostgreSQL | 1GB RAM, 5GB disco | 2GB RAM, 50GB disco |
| Ollama (opcional) | ❌ Não cabe | +$5 por 4GB RAM |
| **Total** | Grátis | ~$10/mês |

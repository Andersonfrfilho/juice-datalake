# Data Lake Platform Specification

## Problem Statement

Times de marketing e negócios de uma distribuidora de sucos precisam tomar decisões baseadas em dados (qual suco investir, onde expandir, previsão de demanda), mas dependem de analistas para consultar bancos transacionais. O data lake centraliza múltiplas fontes de dados e o chat com IA democratiza o acesso a essas informações.

## Goals

- [x] Gerar 2 anos de dados sintéticos de vendas com sazonalidade e crescimento realista
- [x] Construir data lake funcional com consultas federadas (PostgreSQL + Parquet/MinIO)
- [x] Chat em linguagem natural que responde perguntas de negócio consultando o data lake
- [x] Deploy demonstrativo no Railway

## Out of Scope

| Feature                       | Reason                               |
| ----------------------------- | ------------------------------------ |
| Autenticação de usuários      | Foco no data lake, não em auth       |
| Streaming em tempo real       | Complexidade desnecessária para demo |
| Integração com sistemas reais | Dados são sintéticos                 |
| Exportação de relatórios PDF  | MVP com respostas no chat já supre   |

---

## User Stories

### P1: Infraestrutura do Data Lake ⭐ MVP

**User Story**: As a data engineer, I want a local data lake with PostgreSQL, MinIO, and Trino so that I can run federated queries across transactional and historical data.

**Why P1**: Sem data lake funcional, nada mais funciona.

**Acceptance Criteria**:
1. WHEN `docker compose up` THEN system SHALL provision PostgreSQL, MinIO, Trino, and Hive Metastore containers
2. WHEN Trino starts THEN system SHALL have PostgreSQL catalog and Hive/MinIO catalog configured
3. WHEN running `SELECT * FROM postgresql.public.products` via Trino THEN system SHALL return product data from PostgreSQL
4. WHEN running a federated query joining PostgreSQL and MinIO tables THEN system SHALL return correct merged results

**Independent Test**: `docker compose up` e executar query `SELECT * FROM postgresql.public.sales` via Trino CLI.

---

### P1: Geração de Dados Sintéticos ⭐ MVP

**User Story**: As a data engineer, I want a script that generates realistic synthetic sales data so that the data lake has meaningful data to query.

**Why P1**: Sem dados, o data lake é um container vazio.

**Acceptance Criteria**:
1. WHEN running data generator THEN system SHALL create 20+ juice products with realistic names, categories, and costs
2. WHEN running data generator THEN system SHALL create 50+ stores across 5 regions in Brazil
3. WHEN running data generator THEN system SHALL generate 2 years of daily sales (730 dias) with seasonal variation and growth trend
4. WHEN data is generated THEN system SHALL insert transactional data into PostgreSQL and export historical snapshots to MinIO in Parquet format

**Independent Test**: Rodar `npm run generate` e verificar registros no PostgreSQL e arquivos Parquet no MinIO.

---

### P1: Chat com IA Consultando Data Lake ⭐ MVP

**User Story**: As a marketing manager, I want to ask natural language questions about juice sales and get data-backed answers so that I can make informed decisions without SQL knowledge.

**Why P1**: Este é o core da demonstração — democratizar acesso a dados.

**Acceptance Criteria**:
1. WHEN user types "Qual suco mais vendeu em São Paulo nos últimos 3 meses?" THEN system SHALL translate to SQL federated query and return top product with sales amount
2. WHEN user asks about regional performance THEN system SHALL query Trino joining store region data with sales data
3. WHEN user asks a question outside the data domain THEN system SHALL respond explaining data scope limitations
4. WHEN Trino query fails THEN system SHALL show a user-friendly error message with retry option

**Independent Test**: Abrir chat, digitar pergunta de negócio, ver resposta baseada em dados reais do data lake.

---

### P2: Dashboard de KPIs

**User Story**: As a business executive, I want a dashboard with key metrics (total sales, top products, regional breakdown) so that I can get a quick overview before diving into specific questions.

**Why P2**: Complementa o chat com visualização imediata dos principais indicadores.

**Acceptance Criteria**:
1. WHEN dashboard loads THEN system SHALL display total sales for current month and previous month with % change
2. WHEN dashboard loads THEN system SHALL display top 5 juice flavors by revenue with bar chart
3. WHEN dashboard loads THEN system SHALL display sales by region with a map or chart
4. WHEN user clicks on a KPI card THEN system SHALL navigate to chat with a pre-filled question about that metric

**Independent Test**: Acessar `/dashboard`, ver KPIs carregando com dados do Trino.

---

### P3: Deploy no Railway

**User Story**: As a stakeholder, I want the platform deployed on Railway so that I can demonstrate it publicly without local setup.

**Why P3**: Demonstração pública, mas a experiência local já prova o conceito.

**Acceptance Criteria**:
1. WHEN deploying to Railway THEN Next.js app shall be accessible via public URL
2. WHEN deployed THEN PostgreSQL shall be provisioned by Railway
3. WHEN deployed THEN data shall be pre-loaded and queryable
4. WHEN deployed THEN chat and dashboard shall function identically to local setup

**Independent Test**: Acessar URL pública do Railway, usar chat, ver dashboard.

---

## Edge Cases

- WHEN user asks question with ambiguous terms ("qual o melhor suco?") THEN system SHALL ask clarifying question about metric (revenue? volume? margin?)
- WHEN data lake has zero sales for a specific region/period THEN system SHALL respond "Nenhuma venda encontrada para este período/região"
- WHEN user asks question involving future prediction THEN system SHALL use trend analysis from historical data with disclaimers
- WHEN multiple questions arrive simultaneously THEN system SHALL handle concurrent Trino queries without errors
- WHEN Trino connection drops THEN system SHALL show "Data lake temporariamente indisponível" with retry after 5s

---

## Requirement Traceability

| Requirement ID | Story                     | Phase  | Status     |
| -------------- | ------------------------- | ------ | ---------- |
| DL-01          | P1: Docker Infrastructure | Design | In Design  |
| DL-02          | P1: Trino Catalogs        | Design | In Design  |
| DL-03          | P1: Federated Queries     | Design | In Design  |
| DL-04          | P1: Data Generator        | Design | In Design  |
| DL-05          | P1: Parquet Export        | Design | In Design  |
| DL-06          | P1: NL to SQL Chat        | Design | In Design  |
| DL-07          | P1: Trino Query Execution | Design | In Design  |
| DL-08          | P2: KPI Dashboard         | Design | In Design  |
| DL-09          | P2: Sales Charts          | Design | In Design  |
| DL-10          | P2: Regional Breakdown    | Design | In Design  |
| DL-11          | P3: Railway Deploy        | Design | In Design  |

---

## Success Criteria

- [ ] Usuário consegue subir ambiente completo com um comando: `docker compose up`
- [ ] Usuário consegue gerar dados com um comando: `npm run generate`
- [ ] Usuário faz pergunta no chat e obtém resposta baseada em dados em < 5 segundos
- [ ] 100% das perguntas do doc BUSINESS_QUESTIONS.md são respondíveis pelo sistema
- [ ] Platform deployable no Railway com documentação de deploy

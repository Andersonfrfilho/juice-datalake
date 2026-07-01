# Juice Datalake

**Vision:** Plataforma de data lake para uma distribuidora de sucos que permite times de marketing e negócios fazerem perguntas em linguagem natural sobre vendas e obterem respostas baseadas em dados em tempo real.
**For:** Times de marketing, vendas e executivos de negócio da distribuidora.
**Solves:** Centralização de dados dispersos (vendas, produtos, lojas, regiões) em um data lake consultável via chat, eliminando dependência de analistas de dados para perguntas rotineiras de negócio.

## Goals

- Gerar e ingerir dados sintéticos realistas de uma distribuidora de sucos (vendas, produtos, lojas, regiões, sazonalidade)
- Construir um data lake local com Docker (PostgreSQL + MinIO + Trino) capaz de consultas federadas
- Interface de chat em Next.js que traduz perguntas de negócio em SQL e consulta o data lake
- Deploy demonstrativo no Railway para acesso público
- Documentar perguntas essenciais de negócio que marketing e executivos devem fazer

## Tech Stack

**Core:**
- Framework: Next.js 14 (App Router) + TypeScript 5
- Language: TypeScript
- Database: PostgreSQL 16 (transacional)
- Data Lake Storage: MinIO (S3-compatible)
- Query Engine: Trino (federated queries PostgreSQL + MinIO)
- Metastore: Hive Metastore standalone

**Key dependencies:**
- trino-client (Node.js Trino connector)
- DuckDB (embedded analytical engine, fallback)
- OpenAI SDK (NL → SQL translation)
- Tailwind CSS + Shadcn UI (frontend)
- Faker.js (synthetic data generation)
- date-fns (date manipulation)

## Scope

**v1 includes:**
- Docker Compose com PostgreSQL, MinIO, Trino, Hive Metastore
- Script de geração de dados sintéticos: 2 anos de vendas, 20+ sabores de suco, 50+ lojas, 5 regiões
- Pipeline ETL: carga transacional no PostgreSQL + exportação de dados históricos para MinIO em Parquet
- Catálogo Trino configurado para consultar PostgreSQL e MinIO via Hive
- Next.js com chat IA que traduz perguntas de negócio para SQL federado no Trino
- Dashboard com KPIs principais (vendas totais, top produtos, vendas por região)
- Documentação de perguntas de negócio com objetivos e parâmetros
- Deploy no Railway com configuração `railway.json`

**Explicitly out of scope:**
- Autenticação e autorização de usuários
- Pipeline de streaming em tempo real (Kafka)
- Integração com ERP real
- Dashboard customizável pelo usuário (apenas KPIs fixos)
- Multi-tenancy

## Constraints

- Timeline: Sem restrição (projeto demonstrativo)
- Technical: Deve rodar completamente em Docker local e depois no Railway
- Resources: Uso de serviços free tier onde possível (Railway starter, OpenAI créditos)
- Dados: Totalmente sintéticos, sem dados reais

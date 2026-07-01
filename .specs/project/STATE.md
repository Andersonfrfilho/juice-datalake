# STATE — Juice Datalake

## Decisions
- **Trino + Hive Metastore + MinIO** para arquitetura local enterprise-grade de data lake
- **DuckDB embedded** como fallback para Railway (Trino/MinIO são pesados para free tier)
- **Parquet com particionamento por ano/mês** no MinIO
- **OpenAI GPT-4o-mini** para tradução NL→SQL (melhor custo-benefício)
- **24 produtos, 60 lojas, 730 dias** de dados sintéticos (~150k-200k registros)
- Dados com sazonalidade realista (verão +50% tropical/cítrico, inverno -30%) e crescimento 15% YoY

## Blockers
- Nenhum

## Todos
- [ ] Rodar `docker compose up` para validar que Trino conecta em PostgreSQL + MinIO
- [ ] Rodar data generator e validar que Parquet aparece no MinIO
- [ ] Testar chat com pergunta real
- [ ] Deploy no Railway

## Deferred Ideas
- Autenticação de usuários (Google OAuth)
- Streaming de vendas em tempo real (Kafka/Redpanda)
- Integração com dados climáticos (API OpenWeather) para correlacionar clima × vendas
- Exportação de relatórios PDF
- Customização de dashboard pelo usuário (drag & drop widgets)

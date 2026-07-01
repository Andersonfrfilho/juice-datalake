.PHONY: up down restart status logs infra-logs generate seed test test-data test-minio test-trino chat dev build clean all

# ═══════════════════════════════════════════
# Juice Data Lake - Makefile
# ═══════════════════════════════════════════

PROJECT_NAME := juice-datalake
DOCKER_COMPOSE := docker compose -p $(PROJECT_NAME) -f docker/docker-compose.yml

# ══════ Infraestrutura (Docker) ══════

up:
	@echo "==> Subindo $(PROJECT_NAME)..."
	$(DOCKER_COMPOSE) up -d
	@echo "==> Aguardando containers..."
	@for i in 1 2 3 4 5 6 7 8 9 10 11 12; do \
		ready=$$($(DOCKER_COMPOSE) ps --format json 2>/dev/null | grep -c '"Health":"healthy"' || true); \
		total=$$($(DOCKER_COMPOSE) ps --format json 2>/dev/null | grep -c '"Name"' || true); \
		if [ "$$ready" -ge 3 ]; then \
			echo "==> Infraestrutura pronta! ($$ready healthy)"; \
			break; \
		fi; \
		echo "   ... aguardando ($$i/12)  [healthy: $$ready/$$total]"; \
		sleep 10; \
	done
	@$(DOCKER_COMPOSE) ps

down:
	@echo "==> Parando $(PROJECT_NAME)..."
	$(DOCKER_COMPOSE) down

restart: down up

status:
	$(DOCKER_COMPOSE) ps

logs:
	$(DOCKER_COMPOSE) logs -f

infra-logs:
	$(DOCKER_COMPOSE) logs -f postgres trino minio

# ══════ Dados (Seeders) ══════

install-generator:
	cd data-generator && npm install

generate: install-generator
	@echo "==> Gerando dados sintéticos (produtos, lojas, vendas)..."
	cd data-generator && npm run generate

seed: generate

reseed: generate

# ══════ Testes ══════

test:
	@echo "==> Rodando testes de validação..."
	@cd web/tests && npx tsx src/validate.ts

test-data:
	@echo "==> Contagem de registros no PostgreSQL..."
	@docker exec juice-postgres psql -U jadmin -d juicedb -c "SELECT 'Products' as tabela, COUNT(*)::TEXT FROM products UNION ALL SELECT 'Stores', COUNT(*)::TEXT FROM stores UNION ALL SELECT 'Sales', COUNT(*)::TEXT FROM sales UNION ALL SELECT 'Revenue (R\$)', COALESCE(SUM(total_amount),0)::TEXT FROM sales;"

test-minio:
	@echo "==> Arquivos no MinIO..."
	@docker run --rm --network datalake-net --entrypoint "" minio/mc:latest sh -c "mc alias set local http://minio:9000 minioadmin minioadmin123 && mc ls --recursive local/datalake/" 2>/dev/null || echo "MinIO não disponível"

test-trino:
	@echo "==> Testando Trino - top 5 produtos..."
	@docker exec juice-trino trino --execute "SELECT p.name, COUNT(*) as vendas, CAST(SUM(s.total_amount) AS DECIMAL(12,2)) as receita FROM postgresql.public.sales s JOIN postgresql.public.products p ON s.product_id = p.id GROUP BY p.name ORDER BY receita DESC LIMIT 5;"

# ══════ Aplicação Web ══════

install-web:
	cd web && npm install

dev: install-web
	cd web && npm run dev

build: install-web
	cd web && npm run build

chat:
	@echo "==> Chat: http://localhost:3000"

dashboard:
	@echo "==> Dashboard: http://localhost:3000"

# ══════ IA Local (Opcional) ══════
# Requer Ollama no docker-compose.yml descomentado

ollama-up:
	@echo "==> Ativando IA local (Ollama + qwen2.5:3b)..."
	@echo "    Primeiro start pode demorar 5-10min baixando o modelo (~2GB)"
	docker compose -p $(PROJECT_NAME) -f docker/docker-compose.yml up -d ollama

ollama-pull:
	@echo "==> Baixando modelo qwen2.5:3b..."
	docker exec juice-ollama ollama pull qwen2.5:3b

ollama-test:
	@echo "==> Testando Ollama..."
	@curl -s http://localhost:11434/api/generate -d '{"model":"qwen2.5:3b","prompt":"SELECT 1","stream":false}' | head -c 200

# ══════ Tudo ══════

all: up generate dev
	@echo ""
	@echo "╔══════════════════════════════════════════════╗"
	@echo "║  $(PROJECT_NAME) pronto!                       ║"
	@echo "║                                              ║"
	@echo "║  Chat/Dashboard: http://localhost:3000       ║"
	@echo "║  MinIO Console:  http://localhost:9001       ║"
	@echo "║  Trino UI:       http://localhost:8080       ║"
	@echo "║                                              ║"
	@echo "║  PG: localhost:5432 (jadmin/juice123/juicedb)║"
	@echo "║  S3: localhost:9000 (minioadmin/***)         ║"
	@echo "╚══════════════════════════════════════════════╝"

# ══════ Limpeza ══════

clean:
	@echo "==> Removendo containers, volumes, node_modules..."
	$(DOCKER_COMPOSE) down -v 2>/dev/null || true
	rm -rf data-generator/node_modules web/node_modules web/.next
	@echo "==> $(PROJECT_NAME) limpo!"

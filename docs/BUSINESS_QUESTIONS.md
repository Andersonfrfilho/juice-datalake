# Business Questions: Marketing & Negócios

Documento-guia com as perguntas essenciais que times de marketing e negócios devem fazer ao data lake da distribuidora de sucos. Cada pergunta inclui objetivo de negócio, parâmetros aceitáveis, e o que esperar da resposta.

---

## Categoria 1: Performance de Produto

### Q1: Qual suco está vendendo mais?

**Objetivo:** Identificar o produto campeão de vendas para priorizar estoque, produção e campanhas.

**Parâmetros:**
| Parâmetro  | Tipo     | Exemplos                                      |
| ---------- | -------- | --------------------------------------------- |
| Métrica    | `enum`   | `receita`, `volume` (unidades), `margem`      |
| Período    | `string` | "último mês", "último trimestre", "2024"      |
| Região     | `string` | "Sudeste", "todas", "São Paulo"               |
| Categoria  | `string` | "citrico", "tropical", "tradicional", "todas" |

**Exemplo de pergunta:** _"Qual suco gerou mais receita no Sudeste no último trimestre?"_

**Resposta esperada:** Ranking com nome do suco, receita total, volume vendido, participação % na receita da região.

**Decisão de negócio:** Aumentar produção do campeão, replicar estratégia em outras regiões.

---

### Q2: Qual sabor/categoria está crescendo mais?

**Objetivo:** Identificar tendências de consumo para direcionar desenvolvimento de produtos e marketing.

**Parâmetros:**
| Parâmetro  | Tipo     | Exemplos                                |
| ---------- | -------- | --------------------------------------- |
| Métrica    | `enum`   | `crescimento_receita`, `crescimento_volume` |
| Período    | `string` | "trimestre a trimestre", "ano a ano"    |
| Lookback   | `number` | 3, 6, 12 (meses)                        |
| Categoria  | `string` | "todas", "premium", "light"             |

**Exemplo:** _"Qual categoria de suco mais cresceu em volume nos últimos 6 meses comparado com o semestre anterior?"_

**Resposta esperada:** Categoria, crescimento %, fatores (novas lojas, aumento de preço, sazonalidade).

**Decisão de negócio:** Investir em marketing e P&D na categoria em ascensão.

---

### Q3: Quais são os sucos com pior desempenho?

**Objetivo:** Identificar produtos para possível descontinuação ou reformulação.

**Parâmetros:**
| Parâmetro | Tipo     | Exemplos                             |
| --------- | -------- | ------------------------------------ |
| Métrica   | `enum`   | `receita`, `volume`, `margem`        |
| Threshold | `number` | 10-30 (%) — produtos abaixo de X% da receita total |
| Período   | `string` | "último trimestre", "últimos 6 meses" |

**Exemplo:** _"Quais sucos representam menos de 10% da receita total nos últimos 6 meses?"_

**Resposta esperada:** Lista de sucos com receita, volume, e % do total.

**Decisão de negócio:** Descontinuar ou reformular produtos de baixo desempenho.

---

## Categoria 2: Análise Regional e Geográfica

### Q4: Qual região está performando melhor?

**Objetivo:** Direcionar investimento de expansão e marketing regional.

**Parâmetros:**
| Parâmetro  | Tipo     | Exemplos                                |
| ---------- | -------- | --------------------------------------- |
| Métrica    | `enum`   | `receita_total`, `crescimento`, `ticket_medio` |
| Período    | `string` | "último trimestre", "2025"              |
| Agrupamento| `enum`   | `região`, `estado`, `cidade`            |

**Exemplo:** _"Qual região teve maior crescimento de receita em 2025 vs 2024?"_

**Resposta esperada:** Ranking de regiões com receita, crescimento %, ticket médio, volume vendido.

**Decisão de negócio:** Abrir mais lojas na região de maior crescimento, investigar regiões estagnadas.

---

### Q5: Onde devemos abrir a próxima loja?

**Objetivo:** Identificar cidades/regiões com demanda não atendida (alta densidade populacional sem cobertura de lojas).

**Parâmetros:**
| Parâmetro       | Tipo     | Exemplos                    |
| --------------- | -------- | --------------------------- |
| Cobertura atual | —        | Cidades sem lojas da rede   |
| Potencial       | —        | Baseado em vendas de cidades similares |

**Exemplo:** _"Quais cidades com mais de 200k habitantes no Nordeste não têm nossas lojas e têm potencial de vendas?"_

**Resposta esperada:** Lista de cidades candidatas com população estimada, vendas médias de cidades similares, projeção de receita.

**Decisão de negócio:** Priorizar abertura de lojas nas top 3 cidades candidatas.

---

### Q6: Compare vendas entre tipos de loja

**Objetivo:** Entender qual canal de venda (supermercado, conveniência, atacado) performa melhor.

**Parâmetros:**
| Parâmetro | Tipo     | Exemplos                                    |
| --------- | -------- | ------------------------------------------- |
| Métrica   | `enum`   | `receita_media_por_loja`, `ticket_medio`, `volume` |
| Período   | `string` | "último trimestre", "2025"                  |
| Região    | `string` | (opcional) filtrar por região               |

**Exemplo:** _"Qual tipo de loja tem maior ticket médio na região Sul?"_

**Resposta esperada:** Comparativo por tipo de loja com receita total, ticket médio, número de lojas, receita média por loja.

**Decisão de negócio:** Investir no formato de loja mais rentável.

---

## Categoria 3: Sazonalidade e Previsão

### Q7: Qual a sazonalidade de vendas de cada categoria?

**Objetivo:** Planejar produção, estoque e campanhas de acordo com picos sazonais.

**Parâmetros:**
| Parâmetro  | Tipo     | Exemplos                                |
| ---------- | -------- | --------------------------------------- |
| Categoria  | `string` | "citrico", "tropical", "todas"          |
| Período    | `string` | "últimos 12 meses", "últimos 2 anos"    |
| Granularidade | `enum` | `mensal`, `semanal`                     |

**Exemplo:** _"Qual o padrão sazonal de vendas de sucos cítricos nos últimos 2 anos?"_

**Resposta esperada:** Série temporal com picos e vales identificados (ex: pico em dezembro-janeiro para cítricos).

**Decisão de negócio:** Aumentar estoque em 30% nos meses de pico, campanhas promocionais nos vales.

---

### Q8: Qual a previsão de vendas para os próximos 3 meses?

**Objetivo:** Projeção de demanda para planejamento financeiro e de produção.

**Parâmetros:**
| Parâmetro  | Tipo     | Exemplos                              |
| ---------- | -------- | ------------------------------------- |
| Horizonte  | `number` | 1-6 (meses)                           |
| Categoria  | `string` | "todas", "premium"                    |
| Região     | `string` | "todas", "Sudeste"                    |

**Exemplo:** _"Qual a previsão de vendas para os próximos 3 meses na região Nordeste?"_

**Resposta esperada:** Projeção mensal com intervalo de confiança, baseada em tendência + sazonalidade histórica.

**Decisão de negócio:** Ajustar ordens de produção, contratar equipe extra se necessário.

---

### Q9: Em qual suco devemos investir mais nos próximos 3 meses?

**Objetivo:** Identificar o produto com maior potencial de crescimento no curto prazo.

**Parâmetros:**
| Parâmetro     | Tipo     | Exemplos                |
| ------------- | -------- | ----------------------- |
| Horizonte     | `number` | 3 (meses)               |
| Critério      | `enum`   | `crescimento`, `margem`, `potencial_combinado` |
| Região        | `string` | (opcional)              |

**Exemplo:** _"Em qual suco devemos investir mais nos próximos 3 meses considerando tendência de crescimento e margem?"_

**Resposta esperada:** Ranking de sucos com score combinado (crescimento projetado × margem × sazonalidade favorável), com justificativa.

**Decisão de negócio:** Alocar budget de marketing e produção no top 3 sucos.

---

## Categoria 4: Precificação e Margem

### Q10: Qual a margem média por categoria de suco?

**Objetivo:** Avaliar rentabilidade por linha de produto.

**Parâmetros:**
| Parâmetro | Tipo     | Exemplos                       |
| --------- | -------- | ------------------------------ |
| Período   | `string` | "último trimestre", "2025"     |
| Agrupamento | `enum` | `categoria`, `sabor`, `tamanho` |

**Exemplo:** _"Qual a margem média por categoria de suco no último trimestre?"_

**Resposta esperada:** Tabela com categoria, preço médio, custo médio, margem bruta (R$ e %), volume vendido.

**Decisão de negócio:** Aumentar preço de categorias com margem baixa, promover categorias com margem alta.

---

### Q11: Existe correlação entre preço e volume vendido?

**Objetivo:** Entender elasticidade-preço para otimizar precificação.

**Parâmetros:**
| Parâmetro  | Tipo     | Exemplos                     |
| ---------- | -------- | ---------------------------- |
| Produto    | `string` | "todos", "Laranja 500ml"     |
| Período    | `string` | "último ano"                 |

**Exemplo:** _"Quando o preço do suco de laranja 500ml variou, como o volume de vendas respondeu?"_

**Resposta esperada:** Correlação preço × volume, elasticidade estimada.

**Decisão de negócio:** Ajustar preço para maximizar receita (preço × volume).

---

## Categoria 5: Operações e Estoque

### Q12: Quais lojas estão com vendas abaixo da média?

**Objetivo:** Identificar lojas com baixo desempenho para intervenção.

**Parâmetros:**
| Parâmetro | Tipo     | Exemplos                                    |
| --------- | -------- | ------------------------------------------- |
| Threshold | `number` | 20-50 (%) — lojas com vendas X% abaixo da média regional |
| Período   | `string` | "último mês", "último trimestre"            |

**Exemplo:** _"Quais lojas do Sudeste venderam 30% abaixo da média regional no último mês?"_

**Resposta esperada:** Lista de lojas com vendas, média regional, gap %, possível causa (cidade pequena, loja nova).

**Decisão de negócio:** Visitar lojas underperforming, campanha local, possível fechamento.

---

### Q13: Qual o giro de produto por loja?

**Objetivo:** Otimizar distribuição e evitar ruptura de estoque.

**Parâmetros:**
| Parâmetro | Tipo     | Exemplos                          |
| --------- | -------- | --------------------------------- |
| Produto   | `string` | "todos", "Laranja 350ml"          |
| Período   | `string` | "último mês"                      |
| Região    | `string` | (opcional)                        |

**Exemplo:** _"Qual o giro médio diário de cada sabor de suco por loja no último mês?"_

**Resposta esperada:** Média de unidades vendidas por dia por loja para cada produto.

**Decisão de negócio:** Ajustar frequência de reposição, reduzir estoque de produtos de giro baixo.

---

## Categoria 6: Clientes e Mercado (Dados Externos / Estimados)

### Q14: Qual o ticket médio por região?

**Objetivo:** Entender poder de compra regional para precificação e sortimento.

**Parâmetros:**
| Parâmetro | Tipo     | Exemplos                  |
| --------- | -------- | ------------------------- |
| Período   | `string` | "último trimestre"        |
| Agrupamento | `enum` | `região`, `estado`        |

**Exemplo:** _"Qual o ticket médio por região no último trimestre?"_

**Resposta esperada:** Ticket médio (R$ por venda), volume médio por compra, preço médio por unidade.

**Decisão de negócio:** Oferecer tamanhos maiores em regiões de ticket alto, econômicos em ticket baixo.

---

### Q15: Quais sabores combinam bem para criar um combo promocional?

**Objetivo:** Identificar produtos frequentemente comprados juntos para promoções cross-sell.

**Parâmetros:**
| Parâmetro   | Tipo     | Exemplos               |
| ----------- | -------- | ---------------------- |
| Suporte min | `number` | 5-10 (%) — % mínima de transações com a combinação |
| Período     | `string` | "último trimestre"     |

**Exemplo:** _"Quais sabores de suco são mais comprados juntos na mesma transação?"_

**Resposta esperada:** Pares de sabores com frequência de co-ocorrência, % de transações.

**Decisão de negócio:** Criar combos promocionais com os pares mais frequentes.

---

## Resumo: Frequência de Uso por Time

| Time          | Perguntas Essenciais                          | Frequência       |
| ------------- | ----------------------------------------------| ---------------- |
| Marketing     | Q1, Q2, Q3, Q7, Q9, Q11, Q15                  | Semanal          |
| Vendas        | Q4, Q5, Q6                                    | Quinzenal        |
| Operações     | Q12, Q13                                       | Semanal          |
| Financeiro    | Q10, Q11                                       | Mensal           |
| Executivo     | Q1, Q4, Q8, Q9                                 | Mensal/Trimestral|

---

## Como o Data Lake Responde Essas Perguntas

Cada pergunta é traduzida para uma query SQL federada que o **Trino** executa:

1. **Dados transacionais** (vendas do dia, preços atuais) → PostgreSQL
2. **Dados históricos** (vendas de meses/anos anteriores) → MinIO (Parquet)
3. **Dados agregados** (pré-calculados para performance) → MinIO (daily_aggregations)
4. **Junção de fontes** → Trino faz JOIN entre PostgreSQL e MinIO em uma única query

**Exemplo — Q9 ("Em qual suco investir nos próximos 3 meses?"):**

```sql
WITH recent_trend AS (
  SELECT product_id, 
         SUM(total_amount) as revenue_3m,
         AVG(total_amount) as avg_monthly,
         REGR_SLOPE(total_amount, EXTRACT(DAY FROM sale_date)) as trend_slope
  FROM hive.datalake.sales
  WHERE sale_date >= DATE_ADD('month', -6, CURRENT_DATE)
  GROUP BY product_id
),
product_margins AS (
  SELECT p.id, p.name, p.category,
         AVG(s.unit_price - p.cost_price) / AVG(s.unit_price) as margin_pct
  FROM postgresql.public.products p
  JOIN hive.datalake.sales s ON p.id = s.product_id
  WHERE s.sale_date >= DATE_ADD('month', -3, CURRENT_DATE)
  GROUP BY p.id, p.name, p.category
)
SELECT pm.name, pm.category,
       ROUND(rt.revenue_3m, 2) as revenue_last_3m,
       ROUND(pm.margin_pct * 100, 1) as margin_pct,
       ROUND(rt.trend_slope, 4) as growth_trend,
       (rt.trend_slope * 0.5 + pm.margin_pct * 0.5) as investment_score
FROM recent_trend rt
JOIN product_margins pm ON rt.product_id = pm.id
ORDER BY investment_score DESC
LIMIT 5
```

**Nota:** A query acima é gerada automaticamente pela IA com base na pergunta do usuário e no schema do data lake.

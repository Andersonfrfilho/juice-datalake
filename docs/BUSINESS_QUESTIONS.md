# Business Questions: Marketing & Negócios

Documento-guia com **31 perguntas** de negócio respondidas pelo data lake da distribuidora de sucos. Cada pergunta inclui objetivo, parâmetros e decisão esperada. O sistema funciona 100% com templates determinísticos — sem dependência de IA.

---

## Categoria 1: Performance de Produto

### Q1: Qual suco está vendendo mais? *(top-product)*

**Objetivo:** Identificar o produto campeão de vendas para priorizar estoque, produção e campanhas.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Métrica | `enum` | `receita`, `volume` |
| Período | `string` | "último mês", "último trimestre", "2024" |
| Região | `string` | "Sudeste", "todas" |
| Categoria | `string` | "citrico", "tropical", "todas" |
| Limit | `number` | 5, 10 |

**Exemplo:** _"Qual suco gerou mais receita no Sudeste no último trimestre?"_

**Decisão:** Aumentar produção do campeão, replicar estratégia em outras regiões.

---

### Q2: Qual sabor/categoria está crescendo mais? *(growing-category)*

**Objetivo:** Identificar tendências de consumo para direcionar P&D e marketing.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "últimos 6 meses", "2025" |

**Exemplo:** _"Qual categoria mais cresceu em volume nos últimos 6 meses?"_

**Decisão:** Investir em marketing e P&D na categoria em ascensão.

---

### Q3: Quais são os sucos com pior desempenho? *(worst-product)*

**Objetivo:** Identificar produtos para possível descontinuação ou reformulação.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre", "2025" |
| Região | `string` | "todas", "Sudeste" |
| Limit | `number` | 5, 10 |

**Exemplo:** _"Quais sucos menos venderam no último ano?"_

**Decisão:** Descontinuar ou reformular produtos de baixo desempenho.

---

### Q4: Qual a participação de cada produto na receita? *(market-share)*

**Objetivo:** Entender o peso de cada produto no faturamento total.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre" |
| Categoria | `string` | "todas", "premium" |

**Exemplo:** _"Qual a participação de cada sabor na receita total?"_

**Decisão:** Identificar dependência excessiva de poucos produtos.

---

## Categoria 2: Análise Regional e Geográfica

### Q5: Qual região está performando melhor? *(top-region)*

**Objetivo:** Direcionar investimento de expansão e marketing regional.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Métrica | `enum` | `receita`, `volume` |
| Período | `string` | "este mês", "2025" |

**Exemplo:** _"Qual região vendeu mais este mês?"_

**Decisão:** Abrir mais lojas na região de maior crescimento.

---

### Q6: Compare vendas entre tipos de loja *(store-type-compare)*

**Objetivo:** Entender qual canal (supermercado, conveniência, atacado) performa melhor.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Métrica | `enum` | `receita`, `ticket_medio` |
| Período | `string` | "último trimestre" |

**Exemplo:** _"Qual tipo de loja tem maior ticket médio?"_

**Decisão:** Investir no formato de loja mais rentável.

---

### Q7: Análise de penetração por cidade *(city-analysis)*

**Objetivo:** Identificar cidades com maior potencial de expansão baseado em receita per capita e penetração de mercado.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre" |

**Exemplo:** _"Qual cidade tem maior receita per capita?"_

**Decisão:** Priorizar cidades com alta receita per capita e baixa penetração.

---

### Q8: Onde devemos abrir a próxima loja? *(planejamento estratégico)*

**Objetivo:** Cruzar dados de população, receita per capita e cobertura atual para ranquear cidades candidatas.

**Exemplo:** _"Quais cidades no Nordeste têm potencial de vendas?"_

**Decisão:** Priorizar abertura nas top 3 cidades candidatas.

---

## Categoria 3: Sazonalidade e Tendências

### Q9: Qual a sazonalidade das vendas? *(seasonality)*

**Objetivo:** Planejar produção, estoque e campanhas de acordo com picos sazonais.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Categoria | `string` | "citrico", "todas" |
| Período | `string` | "último ano" |

**Exemplo:** _"Qual o padrão sazonal de sucos cítricos no último ano?"_

**Decisão:** Aumentar estoque em 30% nos meses de pico, campanhas nos vales.

---

### Q10: Qual a previsão de vendas para os próximos meses? *(forecast)*

**Objetivo:** Projeção de demanda usando regressão linear sobre dados históricos.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Horizonte | `number` | 1-6 meses |

**Exemplo:** _"Qual a previsão de vendas para os próximos 3 meses?"_

**Decisão:** Ajustar produção, contratar equipe extra se necessário.

---

### Q11: Comparação ano contra ano (YoY) *(year-over-year)*

**Objetivo:** Analisar crescimento entre 2024 e 2025.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Métrica | `enum` | `receita`, `volume` |

**Exemplo:** _"Qual categoria cresceu mais em 2025 comparado com 2024?"_

**Decisão:** Validar se estratégias de crescimento estão funcionando.

---

### Q12: Comparação mês a mês *(monthly-comparison)*

**Objetivo:** Acompanhar evolução mensal de vendas e identificar anomalias.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre" |

**Exemplo:** _"Como foram as vendas mês a mês no último trimestre?"_

**Decisão:** Detectar quedas repentinas, agir rapidamente.

---

## Categoria 4: Financeiro e Precificação

### Q13: Qual a margem por categoria? *(margins)*

**Objetivo:** Avaliar rentabilidade por linha de produto.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre" |
| Categoria | `string` | "todas", "premium" |

**Exemplo:** _"Qual categoria tem melhor margem?"_

**Decisão:** Promover categorias com margem alta, revisar precificação das baixas.

---

### Q14: Qual o ticket médio por região? *(avg-ticket)*

**Objetivo:** Entender poder de compra regional.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre" |
| Região | `string` | "todas", "Sudeste" |

**Exemplo:** _"Qual o ticket médio por região?"_

**Decisão:** Oferecer tamanhos maiores em ticket alto, econômicos em ticket baixo.

---

### Q15: Relação entre preço e volume *(price-volume)*

**Objetivo:** Entender elasticidade-preço para otimizar precificação.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último ano" |

**Exemplo:** _"Quando o preço variou, como o volume respondeu?"_

**Decisão:** Ajustar preço para maximizar receita (preço × volume).

---

### Q16: Preço médio por categoria *(avg-price)*

**Objetivo:** Monitorar faixa de preços praticados.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre" |
| Região | `string` | (opcional) |

**Exemplo:** _"Qual o preço médio por categoria?"_

**Decisão:** Identificar categorias com margem para aumento de preço.

---

## Categoria 5: Operações e Estoque

### Q17: Quais lojas estão com vendas abaixo da média? *(underperforming-stores)*

**Objetivo:** Identificar lojas com baixo desempenho para intervenção.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Threshold | `number` | 0-30 (%) abaixo da média regional |
| Período | `string` | "último mês" |
| Região | `string` | (opcional) |

**Exemplo:** _"Quais lojas venderam abaixo da média no último mês?"_

**Decisão:** Visitar lojas underperforming, campanha local, possível fechamento.

---

### Q18: Qual o giro de produto? *(product-turnover)*

**Objetivo:** Otimizar distribuição e evitar ruptura de estoque.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último mês" |
| Limit | `number` | 10 |

**Exemplo:** _"Qual o giro médio diário de cada sabor?"_

**Decisão:** Ajustar frequência de reposição.

---

### Q19: Mix de produtos por loja *(products-per-store)*

**Objetivo:** Analisar sortimento e variedade em cada ponto de venda.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último mês" |
| Região | `string` | (opcional) |

**Exemplo:** _"Quantos produtos diferentes cada loja vendeu?"_

**Decisão:** Padronizar sortimento entre lojas similares.

---

## Categoria 6: Representantes e Força de Vendas

### Q20: Qual representante mais vendeu? *(top-representatives)*

**Objetivo:** Ranquear a força de vendas por receita gerada.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre" |
| Região | `string` | (opcional) |
| Limit | `number` | 5, 10 |

**Exemplo:** _"Qual representante mais vendeu no último trimestre?"_

**Decisão:** Premiar top performers, replicar práticas dos melhores.

---

### Q21: Quais representantes estão abaixo da média? *(worst-representatives)*

**Objetivo:** Identificar vendedores que precisam de coaching ou realocação.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre" |
| Região | `string` | (opcional) |

**Exemplo:** _"Quais representantes estão abaixo da média?"_

**Decisão:** Treinamento, mentoria ou substituição.

---

### Q22: Distribuição de representantes por região *(representatives-by-region)*

**Objetivo:** Analisar se a força de vendas está balanceada geograficamente.

**Exemplo:** _"Quantos representantes por região?"_

**Decisão:** Contratar ou realocar vendedores para regiões desbalanceadas.

---

### Q23: Performance completa do representante *(rep-performance-full)*

**Objetivo:** Visão 360°: receita, volume, devoluções, score.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre" |

**Exemplo:** _"Qual a performance completa dos representantes?"_

**Decisão:** Avaliação de desempenho integrada para bônus e promoções.

---

## Categoria 7: Logística e Rotas

### Q24: Visão geral das rotas *(routes-overview)*

**Objetivo:** Comparar rotas por receita, custo e ROI.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre" |
| Região | `string` | (opcional) |

**Exemplo:** _"Qual rota tem melhor ROI?"_

**Decisão:** Expandir rotas com alto retorno, revisar as deficitárias.

---

### Q25: Breakeven por rota *(route-breakeven)*

**Objetivo:** Calcular quantos clientes cada rota precisa para se pagar.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último mês" |

**Exemplo:** _"Quantos clientes cada rota precisa para se pagar?"_

**Decisão:** Fechar ou redesenhar rotas com breakeven inviável.

---

### Q26: Eficiência das rotas *(route-efficiency)*

**Objetivo:** Analisar km/loja, custo/loja e tempo de visita.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último mês" |

**Exemplo:** _"Qual rota é mais eficiente em custo por loja?"_

**Decisão:** Otimizar sequência de visitas, reduzir km rodado.

---

## Categoria 8: Devoluções e Qualidade

### Q27: Devoluções por produto *(returns-analysis)*

**Objetivo:** Identificar produtos com alta taxa de devolução.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre" |

**Exemplo:** _"Qual produto tem mais devoluções?"_

**Decisão:** Investigar qualidade, embalagem ou validade dos produtos problemáticos.

---

### Q28: Devoluções por representante *(returns-by-rep)*

**Objetivo:** Identificar vendedores com alta taxa de devolução.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre" |

**Exemplo:** _"Qual representante tem mais devoluções?"_

**Decisão:** Treinar vendedores em práticas de venda adequadas.

---

### Q29: Motivos de devolução *(return-reasons)*

**Objetivo:** Entender as causas-raiz das devoluções.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "últimos 6 meses" |

**Exemplo:** _"Quais os principais motivos de devolução?"_

**Decisão:** Ações corretivas direcionadas (ex: melhorar embalagem se "danificado" lidera).

---

### Q30: Impacto financeiro das devoluções *(returns-profit-impact)*

**Objetivo:** Quantificar o prejuízo das devoluções: receita líquida = bruta − devoluções.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre" |
| Categoria | `string` | (opcional) |

**Exemplo:** _"Quanto as devoluções impactam o lucro?"_

**Decisão:** Calcular ROI de investimentos em qualidade para reduzir devoluções.

---

### Q31: Devoluções por região *(returns-by-region)*

**Objetivo:** Identificar regiões com maior taxa de devolução, incluindo lucro líquido estimado.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "últimos 6 meses" |

**Exemplo:** _"Qual região tem maior taxa de devolução?"_

**Decisão:** Investigar problemas logísticos ou de armazenamento regionais.

---

### Q32: Qual cliente/loja tem mais devoluções? *(returns-by-store)*

**Objetivo:** Identificar clientes problemáticos com alta taxa de devolução para ação comercial direta.

| Parâmetro | Tipo | Exemplos |
|-----------|------|----------|
| Período | `string` | "último trimestre" |
| Limit | `number` | 5, 10 |

**Exemplo:** _"Qual cliente tem mais devoluções?"_

**Decisão:** Visitar o cliente, entender causa-raiz, renegociar contrato ou condições.

---

## Resumo: Frequência de Uso por Time

| Time | Perguntas | Frequência |
|------|-----------|------------|
| **Marketing** | Q1-Q4, Q9-Q12 | Semanal |
| **Vendas** | Q5-Q8, Q20-Q23 | Quinzenal |
| **Operações** | Q17-Q19, Q24-Q26 | Semanal |
| **Financeiro** | Q13-Q16, Q30-Q31 | Mensal |
| **Qualidade** | Q27-Q31 | Mensal |
| **Executivo** | Q1, Q5, Q10, Q24, Q30 | Mensal/Trimestral |

---

## Glossário de Termos Técnicos

| Termo | Significado |
|-------|-------------|
| **Ticket médio** | Valor médio gasto por compra |
| **Receita bruta** | Faturamento total (quantidade × preço unitário) |
| **Receita líquida** | Receita bruta menos valor devolvido |
| **Margem** | Lucro bruto (preço de venda − custo de produção) |
| **ROI** | Retorno sobre investimento (receita ÷ custo da rota) |
| **Breakeven** | Ponto de equilíbrio — receita iguala os custos |
| **Market share** | Participação percentual de um produto no mercado total |
| **YoY** | Year-over-Year — comparação anual |
| **Sazonalidade** | Variação nas vendas conforme a época do ano |
| **Giro** | Velocidade com que o produto é vendido e reposto |
| **Elasticidade** | Sensibilidade da demanda à variação de preço |
| **Score de performance** | Nota de avaliação do representante (0-5) |
| **Receita per capita** | Receita total dividida pela população da cidade |
| **Taxa de devolução** | Percentual do faturamento perdido com devoluções |
| **Gap percentual** | Diferença percentual entre valor real e média de referência |

---

## Como o Sistema Funciona

O chat usa **29 templates determinísticos** que cobrem as 31 perguntas acima:

```
Usuário pergunta → MatchTemplate (regex + keyword) → Extrai parâmetros
→ Resolve SQL (período, região, categoria) → Executa no Trino → Resposta
```

- **Zero dependência de IA** para 90%+ das perguntas
- **Ollama local** (qwen2.5:3b) como fallback para perguntas fora dos templates
- **Tempo de resposta**: <1s para templates, 3-7s com Ollama

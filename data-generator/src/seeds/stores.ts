import { faker } from "@faker-js/faker";

export interface Store {
  name: string;
  city: string;
  state: string;
  region: string;
  type: string;
  representative_id: number;
  opened_at: string;
}

const storeTypes = ["supermarket", "convenience", "wholesale"] as const;
const typeWeights = [0.6, 0.25, 0.15];
const storeNamePrefixes = ["Mercado", "Supermercado", "Empório", "Mercadinho", "Atacadão", "Super", "Hipermercado", "Max"];

function pickWeighted<T>(items: readonly T[], weights: number[]): T {
  const r = Math.random() * weights.reduce((a, b) => a + b, 0);
  let cumulative = 0;
  for (let i = 0; i < items.length; i++) {
    cumulative += weights[i];
    if (r <= cumulative) return items[i];
  }
  return items[items.length - 1];
}

function storeName(city: string): string {
  const prefix = faker.helpers.arrayElement(storeNamePrefixes);
  return `${prefix} ${city}`;
}

function randomDateBetween(start: string, end: string): string {
  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();
  return new Date(startDate + Math.random() * (endDate - startDate))
    .toISOString()
    .split("T")[0];
}

export function generateStores(repsByRegion: Record<string, number[]>): Store[] {
  const storeConfigs: { city: string; state: string; region: string; count: number }[] = [
    { city: "São Paulo", state: "SP", region: "Sudeste", count: 4 },
    { city: "Rio de Janeiro", state: "RJ", region: "Sudeste", count: 3 },
    { city: "Belo Horizonte", state: "MG", region: "Sudeste", count: 3 },
    { city: "Campinas", state: "SP", region: "Sudeste", count: 2 },
    { city: "Guarulhos", state: "SP", region: "Sudeste", count: 2 },
    { city: "São Bernardo do Campo", state: "SP", region: "Sudeste", count: 2 },
    { city: "Vitória", state: "ES", region: "Sudeste", count: 2 },
    { city: "Santos", state: "SP", region: "Sudeste", count: 2 },

    { city: "Porto Alegre", state: "RS", region: "Sul", count: 3 },
    { city: "Curitiba", state: "PR", region: "Sul", count: 3 },
    { city: "Florianópolis", state: "SC", region: "Sul", count: 2 },
    { city: "Londrina", state: "PR", region: "Sul", count: 2 },

    { city: "Salvador", state: "BA", region: "Nordeste", count: 3 },
    { city: "Recife", state: "PE", region: "Nordeste", count: 3 },
    { city: "Fortaleza", state: "CE", region: "Nordeste", count: 3 },
    { city: "Natal", state: "RN", region: "Nordeste", count: 2 },
    { city: "São Luís", state: "MA", region: "Nordeste", count: 1 },

    { city: "Brasília", state: "DF", region: "Centro-Oeste", count: 3 },
    { city: "Goiânia", state: "GO", region: "Centro-Oeste", count: 3 },
    { city: "Campo Grande", state: "MS", region: "Centro-Oeste", count: 2 },
    { city: "Cuiabá", state: "MT", region: "Centro-Oeste", count: 2 },

    { city: "Manaus", state: "AM", region: "Norte", count: 3 },
    { city: "Belém", state: "PA", region: "Norte", count: 3 },
    { city: "Porto Velho", state: "RO", region: "Norte", count: 1 },
    { city: "Macapá", state: "AP", region: "Norte", count: 1 },
  ];

  const stores: Store[] = [];
  for (const config of storeConfigs) {
    for (let i = 0; i < config.count; i++) {
      const suffix = config.count > 1 ? ` ${i + 1}` : "";
      const repIds = repsByRegion[config.region] || [];
      const repId = repIds.length > 0 ? faker.helpers.arrayElement(repIds) : 1;
      stores.push({
        name: storeName(config.city) + suffix,
        city: config.city,
        state: config.state,
        region: config.region,
        type: pickWeighted(storeTypes, typeWeights),
        representative_id: repId,
        opened_at: randomDateBetween("2022-01-01", "2024-06-01"),
      });
    }
  }

  return stores;
}

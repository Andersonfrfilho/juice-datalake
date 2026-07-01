export interface CityData {
  name: string;
  state: string;
  region: string;
  population_estimate: number;
}

export const cities: CityData[] = [
  // SUDESTE
  { name: "São Paulo", state: "SP", region: "Sudeste", population_estimate: 12300000 },
  { name: "Rio de Janeiro", state: "RJ", region: "Sudeste", population_estimate: 6740000 },
  { name: "Belo Horizonte", state: "MG", region: "Sudeste", population_estimate: 2720000 },
  { name: "Campinas", state: "SP", region: "Sudeste", population_estimate: 1210000 },
  { name: "Guarulhos", state: "SP", region: "Sudeste", population_estimate: 1390000 },
  { name: "São Bernardo do Campo", state: "SP", region: "Sudeste", population_estimate: 844000 },
  { name: "Vitória", state: "ES", region: "Sudeste", population_estimate: 365000 },
  { name: "Santos", state: "SP", region: "Sudeste", population_estimate: 433000 },
  // SUL
  { name: "Porto Alegre", state: "RS", region: "Sul", population_estimate: 1490000 },
  { name: "Curitiba", state: "PR", region: "Sul", population_estimate: 1960000 },
  { name: "Florianópolis", state: "SC", region: "Sul", population_estimate: 508000 },
  { name: "Londrina", state: "PR", region: "Sul", population_estimate: 575000 },
  // NORDESTE
  { name: "Salvador", state: "BA", region: "Nordeste", population_estimate: 2880000 },
  { name: "Recife", state: "PE", region: "Nordeste", population_estimate: 1640000 },
  { name: "Fortaleza", state: "CE", region: "Nordeste", population_estimate: 2680000 },
  { name: "Natal", state: "RN", region: "Nordeste", population_estimate: 890000 },
  { name: "São Luís", state: "MA", region: "Nordeste", population_estimate: 1100000 },
  // CENTRO-OESTE
  { name: "Brasília", state: "DF", region: "Centro-Oeste", population_estimate: 3050000 },
  { name: "Goiânia", state: "GO", region: "Centro-Oeste", population_estimate: 1530000 },
  { name: "Campo Grande", state: "MS", region: "Centro-Oeste", population_estimate: 906000 },
  { name: "Cuiabá", state: "MT", region: "Centro-Oeste", population_estimate: 618000 },
  // NORTE
  { name: "Manaus", state: "AM", region: "Norte", population_estimate: 2200000 },
  { name: "Belém", state: "PA", region: "Norte", population_estimate: 1500000 },
  { name: "Porto Velho", state: "RO", region: "Norte", population_estimate: 539000 },
  { name: "Macapá", state: "AP", region: "Norte", population_estimate: 512000 },
];

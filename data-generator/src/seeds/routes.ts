export interface RouteData {
  name: string;
  representative_id: number;
  region: string;
  weekly_fuel_cost: number;
  weekly_toll_cost: number;
  weekly_vehicle_cost: number;
  weekly_distance_km: number;
}

// Each rep has 1-2 routes. Routes are city clusters.
// Costs vary by region density and distance.

const routeConfigs: { name: string; region: string; cities: string[]; fuel: number; toll: number; vehicle: number; dist: number }[] = [
  { name: "Rota SP Capital", region: "Sudeste", cities: ["São Paulo", "Guarulhos", "São Bernardo do Campo"], fuel: 450, toll: 120, vehicle: 300, dist: 180 },
  { name: "Rota SP Interior", region: "Sudeste", cities: ["Campinas"], fuel: 380, toll: 95, vehicle: 280, dist: 250 },
  { name: "Rota SP Litoral", region: "Sudeste", cities: ["Santos"], fuel: 320, toll: 85, vehicle: 260, dist: 160 },
  { name: "Rota RJ Capital", region: "Sudeste", cities: ["Rio de Janeiro"], fuel: 400, toll: 110, vehicle: 290, dist: 140 },
  { name: "Rota MG", region: "Sudeste", cities: ["Belo Horizonte"], fuel: 420, toll: 90, vehicle: 270, dist: 300 },
  { name: "Rota ES", region: "Sudeste", cities: ["Vitória"], fuel: 350, toll: 60, vehicle: 250, dist: 220 },
  { name: "Rota Sul Capital", region: "Sul", cities: ["Porto Alegre"], fuel: 380, toll: 80, vehicle: 280, dist: 200 },
  { name: "Rota Sul PR", region: "Sul", cities: ["Curitiba", "Londrina"], fuel: 500, toll: 130, vehicle: 320, dist: 380 },
  { name: "Rota Sul SC", region: "Sul", cities: ["Florianópolis"], fuel: 300, toll: 55, vehicle: 240, dist: 150 },
  { name: "Rota Nordeste Capital", region: "Nordeste", cities: ["Salvador", "Recife"], fuel: 600, toll: 100, vehicle: 350, dist: 450 },
  { name: "Rota Nordeste Litoral", region: "Nordeste", cities: ["Fortaleza", "Natal"], fuel: 550, toll: 90, vehicle: 330, dist: 420 },
  { name: "Rota Nordeste MA", region: "Nordeste", cities: ["São Luís"], fuel: 350, toll: 50, vehicle: 240, dist: 280 },
  { name: "Rota Centro-Oeste Capital", region: "Centro-Oeste", cities: ["Brasília", "Goiânia"], fuel: 520, toll: 70, vehicle: 310, dist: 350 },
  { name: "Rota Centro-Oeste Interior", region: "Centro-Oeste", cities: ["Campo Grande", "Cuiabá"], fuel: 650, toll: 90, vehicle: 380, dist: 520 },
  { name: "Rota Norte Capital", region: "Norte", cities: ["Manaus"], fuel: 400, toll: 40, vehicle: 280, dist: 200 },
  { name: "Rota Norte Amazônica", region: "Norte", cities: ["Belém", "Macapá"], fuel: 580, toll: 45, vehicle: 350, dist: 480 },
  { name: "Rota Norte RO", region: "Norte", cities: ["Porto Velho"], fuel: 450, toll: 35, vehicle: 300, dist: 350 },
];

export function generateRoutes(
  repsByRegion: Record<string, number[]>,
  storesByCity: Record<string, number[]>
): { routes: RouteData[]; routeStores: { route_id: number; store_id: number; visit_day: string; visit_order: number; visit_duration_min: number; distance_from_prev_km: number }[] } {
  const days = ["monday", "tuesday", "wednesday", "thursday", "friday"];
  const routes: RouteData[] = [];
  const routeStores: { route_id?: number; store_id: number; visit_day: string; visit_order: number }[] = [];
  let routeIdx = 1;

  for (const config of routeConfigs) {
    const repIds = repsByRegion[config.region] || [];
    if (repIds.length === 0) continue;

    // Assign route to a rep in that region (round-robin)
    const repId = repIds[(routeIdx - 1) % repIds.length];

    routes.push({
      name: config.name,
      representative_id: repId,
      region: config.region,
      weekly_fuel_cost: config.fuel,
      weekly_toll_cost: config.toll,
      weekly_vehicle_cost: config.vehicle,
      weekly_distance_km: config.dist,
    });

    // Assign stores in those cities to this route
    let order = 1;
    const dayIdx = (routeIdx - 1) % days.length;
    const baseDuration = [45, 30, 20, 60][0];
    let cumDist = 0;
    for (const city of config.cities) {
      const storeIds = storesByCity[city] || [];
      for (const storeId of storeIds) {
        cumDist += Math.floor(Math.random() * 15) + 5;
        routeStores.push({
          route_id: routeIdx,
          store_id: storeId,
          visit_day: days[dayIdx],
          visit_order: order,
          visit_duration_min: baseDuration + Math.floor(Math.random() * 15),
          distance_from_prev_km: order === 1 ? 0 : cumDist,
        });
        order++;
      }
    }

    routeIdx++;
  }

  return { routes, routeStores };
}

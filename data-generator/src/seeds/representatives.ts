import { faker } from "@faker-js/faker";

export interface Representative {
  name: string;
  email: string;
  phone: string;
  region: string;
  performance_score: number;
  hire_date: string;
}

const firstNames = [
  "Ana", "Carlos", "Mariana", "Roberto", "Juliana", "Fernando", "Patrícia",
  "Ricardo", "Camila", "Eduardo", "Luciana", "Marcos", "Beatriz", "Gustavo",
  "Renata", "Felipe", "Carolina", "Bruno", "Amanda", "Thiago", "Natália",
  "Rafael", "Vanessa", "Leonardo", "Isabela", "André", "Larissa", "Diego",
  "Priscila", "Alexandre",
];

const lastNames = [
  "Silva", "Santos", "Oliveira", "Souza", "Lima", "Pereira", "Costa",
  "Ferreira", "Rodrigues", "Almeida", "Nascimento", "Araújo", "Barbosa",
  "Cardoso", "Carvalho", "Dias", "Fernandes", "Gomes", "Machado", "Martins",
];

function randomDateBetween(start: string, end: string): string {
  const startDate = new Date(start).getTime();
  const endDate = new Date(end).getTime();
  return new Date(startDate + Math.random() * (endDate - startDate))
    .toISOString()
    .split("T")[0];
}

export function generateRepresentatives(): Representative[] {
  const regions = ["Norte", "Nordeste", "Centro-Oeste", "Sudeste", "Sul"];
  // Reps per region: proportional to store count
  const repsPerRegion: Record<string, number> = {
    Sudeste: 6,
    Sul: 4,
    Nordeste: 4,
    "Centro-Oeste": 4,
    Norte: 3,
  };

  const reps: Representative[] = [];
  const usedNames = new Set<string>();

  for (const region of regions) {
    for (let i = 0; i < repsPerRegion[region]; i++) {
      let fullName: string;
      do {
        fullName = `${faker.helpers.arrayElement(firstNames)} ${faker.helpers.arrayElement(lastNames)}`;
      } while (usedNames.has(fullName));
      usedNames.add(fullName);

      const firstName = fullName.split(" ")[0].toLowerCase();
      reps.push({
        name: fullName,
        email: `${firstName}.${fullName.split(" ").pop()!.toLowerCase()}@juice-distribuidora.com.br`,
        phone: faker.phone.number({ style: "national" }),
        region,
        performance_score: +(2.0 + Math.random() * 3.0).toFixed(1), // 2.0 - 5.0
        hire_date: randomDateBetween("2020-01-01", "2023-12-01"),
      });
    }
  }

  return reps;
}

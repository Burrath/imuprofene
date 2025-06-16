// Mappa delle categorie catastali e dei moltiplicatori IMU
const IMU_MULTIPLIERS: Record<string, number> = {
  A1: 160,
  A2: 160,
  A3: 160,
  A4: 160,
  A5: 160,
  A6: 160,
  A7: 160,
  A8: 160,
  A9: 160,
  A10: 80,
  A11: 160,
  B1: 140,
  B2: 140,
  B3: 140,
  B4: 140,
  B5: 140,
  B6: 140,
  B7: 140,
  C1: 55,
  C2: 160,
  C3: 160,
  C4: 160,
  C5: 160,
  C6: 160,
  C7: 160,
  D1: 65,
  D2: 65,
  D3: 65,
  D4: 65,
  D5: 65,
  D6: 65,
  D7: 65,
  D8: 65,
  D9: 65,
  D10: 135,
};

// Funzione per ottenere il moltiplicatore IMU da una categoria catastale
export function getIMUMultiplier(category: string): number | undefined {
  const normalized = category.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return IMU_MULTIPLIERS[normalized];
}

import {
  SITUAZIONE_TYPE,
  type iAliquoteComune,
  type iImuYearData,
  type iSituazioneVisura,
  type iVisura,
} from "./visuraInterfaces";

function getDaysInYear(year: number): number {
  return new Date(year, 1, 29).getMonth() === 1 ? 366 : 365;
}

function getSituazioneOfASpecificDate(
  date: Date,
  situazioni: iSituazioneVisura[]
) {
  // Step 1: Clean up consecutive RenditaProposta, keep only the last of each group
  const cleanedSituazioni: iSituazioneVisura[] = [];
  for (let i = 0; i < situazioni.length; i++) {
    const current = situazioni[i];
    const next = situazioni[i + 1];

    if (
      current.type === SITUAZIONE_TYPE.RenditaProposta &&
      next?.type === SITUAZIONE_TYPE.RenditaProposta
    ) {
      continue; // skip current, keep only last in sequence
    }

    cleanedSituazioni.push(current);
  }

  for (let i = 0; i < situazioni.length; i++) {
    const situa = situazioni[i];
    const nextSitua = situazioni[i - 1]; // prev in array but next in time
    if (!situa.dal) continue;

    // if a subsequent situazione rettifies the current proposta send the rettified, becasuse the proposta was not valid
    if (
      nextSitua &&
      situa.dal.getTime() <= date.getTime() &&
      situa.type === SITUAZIONE_TYPE.RenditaProposta &&
      nextSitua.type === SITUAZIONE_TYPE.RenditaRettificata
    )
      return nextSitua;

    if (situa.dal.getTime() < date.getTime()) return situa;
  }
}

export function getImuCalculation(
  situazione: iSituazioneVisura,
  aliquota: number
) {
  if (!situazione.categoria || !situazione.rendita) return undefined;

  const categoria = situazione.categoria.toUpperCase();
  const rendita = situazione.rendita;

  // Coefficienti in base alla categoria catastale
  const coefficienti: { [key: string]: number } = {
    A: 160,
    A10: 80,
    B: 140,
    C1: 55,
    C: 160,
    D: 65,
    D5: 80,
  };

  // Estrai il prefisso rilevante per determinare il coefficiente
  const normalizedCategoria = categoria.replace(/\//g, "").toUpperCase(); // es: A3 -> A3
  const coeff =
    coefficienti[normalizedCategoria] ??
    coefficienti[normalizedCategoria.slice(0, 1)];

  if (!coeff) return undefined;

  // Calcolo base imponibile
  const baseImponibile = rendita * 1.05 * coeff;

  // Calcolo IMU
  const imu = baseImponibile * aliquota;

  return {
    imu: Math.round(imu * 100) / 100,
    categoria: normalizedCategoria,
    coefficente: coeff,
    baseImponibile: baseImponibile,
  };
}

export function calculateImu(
  visura: iVisura,
  aliquote: iAliquoteComune
): iImuYearData {
  const currentYear = new Date().getFullYear();
  const minYear = Math.min(
    ...visura.situazioni
      .filter((s) => s.dal)
      .map((s) => s.dal?.getFullYear() ?? 1950)
  );

  const years: number[] = Array.from(
    { length: currentYear - minYear + 1 },
    (_, i) => currentYear - i
  );

  const result: iImuYearData = {};

  years.forEach(async (year) => {
    const start = new Date(year, 0, 1); // January 1st of the year
    const end = new Date(year + 1, 0, 1); // December 31st of the year

    const daysInYear = getDaysInYear(year);

    const usedAliquote: number[] = [];
    const usedCategorie: string[] = [];
    const usedCoefficenti: number[] = [];
    const usedBaseImponibile: number[] = [];

    result[year] = {
      imu: 0,
      rendita: 0,
      aliquote: [],
      categorie: [],
      coefficienti: [],
      basiImponibili: [],
    };

    for (let day = new Date(end); day > start; day.setDate(day.getDate() - 1)) {
      const relevantSitua = getSituazioneOfASpecificDate(
        new Date(day), // create a new Date to avoid mutation issues
        visura.situazioni
      );

      if (!relevantSitua || !relevantSitua.categoria) continue;

      const aliquota = aliquote[visura.comune][year][relevantSitua.categoria];

      if (!aliquota) continue;

      const imuCalc = getImuCalculation(relevantSitua, aliquota);

      if (!imuCalc) continue;

      result[year].imu = result[year].imu + imuCalc.imu / daysInYear;

      result[year].rendita =
        result[year]?.rendita + (relevantSitua?.rendita ?? 0) / daysInYear;

      usedAliquote.push(aliquota);
      usedCategorie.push(imuCalc.categoria);
      usedCoefficenti.push(imuCalc.coefficente);
      usedBaseImponibile.push(imuCalc.baseImponibile);
    }

    result[year].basiImponibili = [...new Set(usedBaseImponibile)];
    result[year].coefficienti = [...new Set(usedCoefficenti)];
    result[year].categorie = [...new Set(usedCategorie)];
    result[year].aliquote = [...new Set(usedAliquote)];
  });

  console.log(result);

  return result;
}

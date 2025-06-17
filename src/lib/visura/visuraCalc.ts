import {
  IMMOBILE_TYPE,
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
  if (!aliquota || aliquota <= 0) return undefined;

  const categoria = situazione.categoria?.toUpperCase();

  const rendita = situazione.rendita;
  const redditoDominicale = situazione.rendita;
  const valoreVenale = situazione.rendita;

  const type = situazione.immobileType;

  // Caso 1: TERRENO EDIFICABILE
  if (type === IMMOBILE_TYPE.TerrenoEdificabile && !rendita && valoreVenale) {
    const imu = valoreVenale * aliquota;
    return {
      imu: Math.round(imu * 100) / 100,
      categoria: "Terreno Edificabile",
      baseImponibile: valoreVenale,
    };
  }

  // Caso 2: TERRENO AGRICOLO (NON EDIFICABILE)
  if (type === IMMOBILE_TYPE.TerrenoAgricolo && !rendita && redditoDominicale) {
    const baseImponibile = redditoDominicale * 1.25 * 135;
    const imu = baseImponibile * aliquota;
    return {
      imu: Math.round(imu * 100) / 100,
      categoria: "Terreno Agricolo",
      baseImponibile,
    };
  }

  // Caso 3: FABBRICATO
  if (type === IMMOBILE_TYPE.Fabbricato) {
    if (!categoria || !rendita) return undefined;

    const coefficienti: { [key: string]: number } = {
      A: 160,
      A10: 80,
      B: 140,
      C1: 55,
      C: 160,
      C2: 160,
      C6: 160,
      C7: 160,
      C3: 140,
      C4: 140,
      C5: 140,
      D: 65,
      D5: 80,
      E: 65,
    };

    const normalizedCategoria = categoria.replace(/\//g, "").toUpperCase();
    const coeff =
      coefficienti[normalizedCategoria] ??
      coefficienti[normalizedCategoria.slice(0, 1)];

    if (!coeff) return undefined;

    const baseImponibile = rendita * 1.05 * coeff;
    const imu = baseImponibile * aliquota;

    return {
      imu: Math.round(imu * 100) / 100,
      tipo: "Immobile",
      categoria: normalizedCategoria,
      coefficente: coeff,
      baseImponibile,
    };
  }
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
      if (imuCalc.coefficente) usedCoefficenti.push(imuCalc.coefficente);
      usedBaseImponibile.push(imuCalc.baseImponibile);
    }

    result[year].basiImponibili = [...new Set(usedBaseImponibile)];
    result[year].coefficienti = [...new Set(usedCoefficenti)];
    result[year].categorie = [...new Set(usedCategorie)];
    result[year].aliquote = [...new Set(usedAliquote)];
  });

  return result;
}

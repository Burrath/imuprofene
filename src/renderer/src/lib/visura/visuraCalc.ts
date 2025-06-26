import {
  IMMOBILE_TYPE,
  SITUAZIONE_TYPE,
  type iAliquoteComune,
  type iImuYearData,
  type iSituazioneVisura,
  type iVisura,
} from "./visuraInterfaces";

function getSituazioneOfASpecificMonth(
  date: Date,
  situazioni: iSituazioneVisura[]
): iSituazioneVisura | undefined {
  if (!situazioni.length) return undefined;

  // Ordina dalla più recente alla più vecchia
  const ordered = [...situazioni].sort(
    (a, b) =>
      (b.dal ? Number(new Date(b.dal).getTime()) : 0) -
      (a.dal ? Number(new Date(a.dal).getTime()) : 0)
  );

  // Rimuovi RenditaProposta consecutive (tieni solo l’ultima di ciascun gruppo)
  const cleanedSituazioni: iSituazioneVisura[] = [];
  for (let i = 0; i < ordered.length; i++) {
    const current = ordered[i];
    const next = ordered[i + 1];

    if (
      current.type === SITUAZIONE_TYPE.RenditaProposta &&
      next?.type === SITUAZIONE_TYPE.RenditaProposta
    ) {
      continue;
    }

    cleanedSituazioni.push(current);
  }

  for (let i = 0; i < cleanedSituazioni.length; i++) {
    const current = cleanedSituazioni[i];
    const next = cleanedSituazioni[i + 1]; // quella precedente nel tempo

    if (!current.dal) continue;

    const start = new Date(current.dal);
    const changeMonth = start.getMonth();
    const changeYear = start.getFullYear();
    const changeDay = start.getDate();

    const targetMonth = date.getMonth();
    const targetYear = date.getFullYear();

    if (changeYear === targetYear && changeMonth === targetMonth) {
      if (changeDay > 15) {
        // Cambio dopo il 15 → valido per il mese corrente
        return current;
      } else {
        // Cambio prima o al 15 → valido quello precedente (se esiste)
        return next ?? current;
      }
    }

    // Se la situazione è iniziata dopo il mese richiesto, salta
    if (
      changeYear > targetYear ||
      (changeYear === targetYear && changeMonth > targetMonth)
    ) {
      continue;
    }

    // Se la situazione è iniziata prima del mese richiesto ed è la prima valida
    return current;
  }

  return undefined;
}

export function getImuCalculation(
  situazione: iSituazioneVisura,
  aliquota: number
) {
  if (!aliquota || aliquota <= 0) return undefined;
  aliquota = aliquota / 100;

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
      imu: imu,
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
      .map((s) => (s.dal ? new Date(s.dal).getFullYear() : 1950))
  );

  const years: number[] = Array.from(
    { length: currentYear - minYear + 1 },
    (_, i) => currentYear - i
  );

  const result: iImuYearData = {};

  years.forEach(async (year) => {
    const usedAliquote: number[] = [];
    const usedCategorie: string[] = [];
    const usedCoefficenti: number[] = [];
    const usedBaseImponibile: number[] = [];

    result[year] = {
      rendita: 0,
      aliquote: [],
      categorie: [],
      coefficienti: [],
      basiImponibili: [],
    };

    for (let month = 0; month < 12; month++) {
      const clonedMonthDate = new Date(year, month, 1);
      const relevantSitua = getSituazioneOfASpecificMonth(
        clonedMonthDate,
        visura.situazioni
      );

      if (!relevantSitua || !relevantSitua.categoria) continue;

      const aliquota = aliquote[visura.comune][year][relevantSitua.categoria];

      if (!aliquota) continue;

      const imuCalc = getImuCalculation(relevantSitua, aliquota);

      if (!imuCalc) continue;

      const monthlyImu = imuCalc.imu / 12;
      result[year].imu = (result[year].imu ?? 0) + monthlyImu;

      const isAnticipo = month < 6; // Gen (0) - Giu (5) => Anticipo

      if (isAnticipo) {
        result[year].imuAnticipo = (result[year].imuAnticipo ?? 0) + monthlyImu;
      } else {
        result[year].imuSaldo = (result[year].imuSaldo ?? 0) + monthlyImu;
      }

      result[year].rendita += (relevantSitua.rendita ?? 0) / 12;

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

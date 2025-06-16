import { getIMUMultiplier } from "./imuMultiplier";
import {
  SITUAZIONE_TYPE,
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

function getImuCalculation(situazione: iSituazioneVisura) {
  if (!situazione.categoria) return 0;

  const IMUmultiplier = getIMUMultiplier(situazione.categoria);

  return IMUmultiplier ?? 0;
}

export function calculateImu(visura: iVisura): iImuYearData {
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

  years.forEach((year) => {
    const start = new Date(year, 0, 1); // January 1st of the year
    const end = new Date(year + 1, 0, 1); // December 31st of the year

    const daysInYear = getDaysInYear(year);

    for (
      let day = new Date(end);
      day >= start;
      day.setDate(day.getDate() - 1)
    ) {
      const relevantSitua = getSituazioneOfASpecificDate(
        new Date(day), // create a new Date to avoid mutation issues
        visura.situazioni
      );

      if (!relevantSitua) continue;

      result[year] = {
        imu:
          (result[year]?.imu ?? 0) +
          getImuCalculation(relevantSitua) / daysInYear,
        rendita:
          (result[year]?.rendita ?? 0) +
          (relevantSitua?.rendita ?? 0) / daysInYear,
      };
    }
  });

  return result;
}

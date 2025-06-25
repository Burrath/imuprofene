import {
  pdfToRawTextData,
  type pdfToRawTextDataRes,
} from "../../../../main/lib/pdf";
import { isWithinDelta } from "../utils";
import type { iF24, iF24voce } from "./f24Interfaces";
import { RAW_FILE_TYPE } from "./fileExtract";

function extractF24Data_v1(rawData: pdfToRawTextDataRes[]): iF24 {
  // console.log(rawData.find((e) => e.text.toLowerCase().includes("versamento")));

  return {};
}
function extractF24Data_v2(rawData: pdfToRawTextDataRes[]): iF24 {
  const getDate = (rawData: pdfToRawTextDataRes[]) => {
    const dateTitleRecord = rawData.find((e) =>
      e.text.toLowerCase().includes("data del versamento")
    );

    if (!dateTitleRecord) return;

    const sameRowRecords = rawData
      .filter(
        (e) =>
          isWithinDelta(e.y, dateTitleRecord?.y, 0.2) &&
          e.startX >= dateTitleRecord.endX
      )
      .sort((a, b) => a.startX - b.startX);

    const dateRecords = sameRowRecords.slice(0, 8);

    const day = dateRecords[0].text + dateRecords[1].text;
    const month = dateRecords[2].text + dateRecords[3].text;
    const year =
      dateRecords[4].text +
      dateRecords[5].text +
      dateRecords[6].text +
      dateRecords[7].text;

    const date = new Date(`${year}-${month}-${day}`);

    return date;
  };

  const getColumnData = (
    rawData: pdfToRawTextDataRes[],
    title: string,
    width: number
  ): pdfToRawTextDataRes[] => {
    const sezioneColWidth = width;

    const sezioneTitleRecord = rawData.find(
      (e) => e.text.toLowerCase().trim() === title.toLowerCase()
    );

    if (!sezioneTitleRecord) return [];

    const sezioneColBoundingCoords = {
      startX: sezioneTitleRecord.avgX - sezioneColWidth,
      endX: sezioneTitleRecord.avgX + sezioneColWidth,
    };

    let latestY = 0;

    const sezioneRecords = rawData.filter((e) => {
      if (latestY && e.y > latestY + 1) return false;

      const found =
        e.y > sezioneTitleRecord.y &&
        e.avgX <= sezioneColBoundingCoords.endX &&
        e.avgX >= sezioneColBoundingCoords.startX;

      if (found) latestY = e.y;

      return found;
    });

    return sezioneRecords ?? [];
  };

  const getVoci = (rawData: pdfToRawTextDataRes[]) => {
    const sezioneRecords = getColumnData(rawData, "sezione", 2.35);
    const codiceRecords = getColumnData(rawData, "codice", 0.88);
    const tributoRecords = getColumnData(rawData, "causale", 1);
    const estremiRecords = getColumnData(
      rawData,
      "estremi identificativi",
      3.53
    );
    const periodiRecords = getColumnData(
      rawData,
      "periodo di riferimento",
      2.35
    );
    const debitoRecords = getColumnData(rawData, "importo a debito", 2.5);
    const creditoRecords = getColumnData(rawData, "importo a credito", 2.5);

    const vociRowsY = new Set([
      ...sezioneRecords.map((e) => e.y),
      ...codiceRecords.map((e) => e.y),
      ...tributoRecords.map((e) => e.y),
      ...estremiRecords.map((e) => e.y),
      ...periodiRecords.map((e) => e.y),
      ...debitoRecords.map((e) => e.y),
      ...creditoRecords.map((e) => e.y),
    ]);

    const voci: iF24voce[] = [];

    vociRowsY.forEach((voceRowY) => {
      const voce: iF24voce = {};

      voce.sezione = sezioneRecords.find((e) => e.y === voceRowY)?.text;
      voce.codice = codiceRecords.find((e) => e.y === voceRowY)?.text;
      voce.causaleTributo = tributoRecords.find((e) => e.y === voceRowY)?.text;

      const estremiSlot = estremiRecords.find((e) => e.y === voceRowY);
      if (estremiSlot) {
        const estremiData = estremiSlot.text
          .split("|")
          .filter((e) => !!e)
          .map((e) => (e === "-" ? "" : e));

        const estremi = {
          ravv: estremiData[0],
          immobVariati: estremiData[1],
          acc: estremiData[2],
          saldo: estremiData[3],
          numberoImmobili: estremiData[4],
        };

        voce.estremi = estremi;
      }

      const periodiSlots = periodiRecords.filter((e) => e.y === voceRowY);
      if (periodiSlots.length === 1) voce.periodo = periodiRecords[0].text;
      if (periodiSlots.length === 2)
        voce.periodo = periodiRecords[0].text + "/" + periodiRecords[1].text;

      voce.importoDebito = Number(
        debitoRecords
          .find((e) => e.y === voceRowY)
          ?.text.replace(".", "")
          .replace(",", ".") ?? 0
      );
      voce.importoCredito = Number(
        creditoRecords
          .find((e) => e.y === voceRowY)
          ?.text.replace(".", "")
          .replace(",", ".") ?? 0
      );

      voci.push(voce);
    });

    return voci;
  };

  const dataVersamento = getDate(rawData);
  const voci = getVoci(rawData);

  return { voci, dataVersamento };
}

export default function parseDataFromF24RawData(
  rawData: pdfToRawTextDataRes[],
  rawFileType: RAW_FILE_TYPE
): iF24 {
  // console.log(rawData);

  if (rawFileType === RAW_FILE_TYPE.f24_v1) return extractF24Data_v1(rawData);
  if (rawFileType === RAW_FILE_TYPE.f24_v2) return extractF24Data_v2(rawData);
  return {};
}

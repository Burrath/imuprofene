import { type pdfToRawTextDataRes } from "../../../../main/lib/pdf";
import { isWithinDelta } from "../utils";
import type { iF24, iF24voce } from "./f24Interfaces";
import { RAW_FILE_TYPE } from "./fileExtract";

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

function extractF24Data_v1(rawData: pdfToRawTextDataRes[]): iF24 {
  const getDate = (rawData: pdfToRawTextDataRes[]) => {
    const titleRecord = rawData.find(
      (e) => e.text.toLowerCase().trim() === "estremi del versamento"
    );

    if (!titleRecord) return;

    const recordsBelow = rawData.filter(
      (e) => e.y > titleRecord.y && e.avgX > e.startX && e.avgX < e.endX
    );

    for (let i = 0; i < recordsBelow.length; i++) {
      const e = recordsBelow[i];
      if (e.text.length !== 8) continue;

      const dateRecords = e.text.split("");
      const day = dateRecords[0] + dateRecords[1];
      const month = dateRecords[2] + dateRecords[3];
      const year =
        dateRecords[4] + dateRecords[5] + dateRecords[6] + dateRecords[7];

      const date = new Date(`${year}-${month}-${day}`);

      if (!isNaN(date.getTime())) return date;
    }
  };

  const getVoci = (rawData: pdfToRawTextDataRes[]): iF24voce[] => {
    const imuTitleRecord = rawData.find(
      (e) =>
        e.text.toLowerCase().trim() === "sezione imu e altri tributi locali"
    );

    if (!imuTitleRecord) return [];

    const relevantRecords = rawData.filter(
      (e) => e.y > imuTitleRecord.y && e.y < imuTitleRecord.y + 4.5
    );

    const codiceRecords = getColumnData(relevantRecords, "codice comune", 0.8);

    const estremiRecords_ravv = getColumnData(relevantRecords, "ravv.", 0.4);
    const estremiRecords_variati = getColumnData(
      relevantRecords,
      "variati",
      0.4
    );
    const estremiRecords_acc = getColumnData(relevantRecords, "acc.", 0.4);
    const estremiRecords_saldo = getColumnData(relevantRecords, "saldo", 0.45);
    const estremiRecords_immobili = getColumnData(
      relevantRecords,
      "immobili",
      0.4
    );

    const tributoRecord = getColumnData(relevantRecords, "codice tributo", 1);

    const periodoRecord_mese = getColumnData(
      relevantRecords,
      "mese rif.",
      0.88
    );
    const periodoRecord_anno = getColumnData(
      relevantRecords,
      "riferimento",
      0.88
    );

    const debitoRecords = getColumnData(
      relevantRecords,
      "importi a debito versati",
      1
    );
    const creditoRecords = getColumnData(
      relevantRecords,
      "importi a credito compensati",
      1
    );

    const vociRowsY = new Set([
      ...codiceRecords.map((e) => e.y),
      ...estremiRecords_ravv.map((e) => e.y),
      ...estremiRecords_variati.map((e) => e.y),
      ...estremiRecords_acc.map((e) => e.y),
      ...estremiRecords_saldo.map((e) => e.y),
      ...estremiRecords_immobili.map((e) => e.y),
      ...tributoRecord.map((e) => e.y),
      ...periodoRecord_mese.map((e) => e.y),
      ...periodoRecord_anno.map((e) => e.y),
      ...debitoRecords.map((e) => e.y),
      ...creditoRecords.map((e) => e.y),
    ]);

    const voci: iF24voce[] = [];

    vociRowsY.forEach((voceRowY) => {
      const voce: iF24voce = {};

      voce.sezione = "TRIB.LOCALI";
      voce.codice = codiceRecords
        .filter((e) => e.y === voceRowY)
        .map((e) => e.text.trim())
        .join("");
      voce.causaleTributo = tributoRecord.find((e) => e.y === voceRowY)?.text;

      const estremi = {
        ravv: estremiRecords_ravv.find((e) => e.y === voceRowY)?.text,
        immobVariati: estremiRecords_variati.find((e) => e.y === voceRowY)
          ?.text,
        acc: estremiRecords_acc.find((e) => e.y === voceRowY)?.text,
        saldo: estremiRecords_saldo.find((e) => e.y === voceRowY)?.text,
        numberoImmobili: estremiRecords_immobili.find((e) => e.y === voceRowY)
          ?.text,
      };
      voce.estremi = estremi;

      let periodo = "";
      if (periodoRecord_mese.length) periodo += periodoRecord_mese[0].text;
      if (periodoRecord_anno.length) periodo += periodoRecord_anno[0].text;
      voce.periodo = periodo;

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

      if (voce.sezione?.trim() !== "TRIB.LOCALI") return;

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
  if (rawFileType === RAW_FILE_TYPE.f24_v1) return extractF24Data_v1(rawData);
  if (rawFileType === RAW_FILE_TYPE.f24_v2) return extractF24Data_v2(rawData);
  return {};
}

import type { pdfToRawTextDataRes } from "../pdf";
import { isWithinDelta } from "../utils";
import {
  type iSituazioneVisura,
  type iUnitàVisura,
  SITUAZIONE_TYPE,
  type iVisura,
} from "./visuraInterfaces";

function getVisuraNumberFromRawData(rawData: pdfToRawTextDataRes[]): string {
  let numero = "";

  const nVisuraSlot = rawData.find((e) =>
    e.text.toLowerCase().includes("visura n")
  );
  const nVisuraRawText = nVisuraSlot?.text;
  const nVisuraMatch = nVisuraRawText?.match(/Visura\s+n\.\:\s*([A-Z]?\d+)/);
  if (nVisuraMatch) numero = nVisuraMatch[1];

  return numero;
}

function getSituazioniFromRawData(
  rawData: pdfToRawTextDataRes[]
): iSituazioneVisura[] {
  const situazioni: iSituazioneVisura[] = [];

  // Take all the rows of the DOC
  const rows = [...new Set(rawData.map((e) => e.y))];

  // put the data in a more readable format, splitting by rows and columns
  const dataInRows: {
    y: number;
    contents: pdfToRawTextDataRes[];
  }[] = [];

  // For each line take the columns
  rows.forEach((row) => {
    let contents = rawData.filter((e) => e.y === row);

    // filter out all the empty records
    contents = contents.filter((e) => e.text && e.text.trim() !== "");

    dataInRows.push({
      y: row,
      contents,
    });
  });

  // find all the situazioni records, this refers to the title of each table in the doc
  const situazioniTitleRecord: pdfToRawTextDataRes[] = [];

  const isSituazioniRecordTitle = (title: string) => {
    if (title.includes("situazione") && title.includes("immobil")) return true;
    if (title.includes("unità immobil")) return true;

    return false;
  };

  rawData.forEach((record) => {
    if (isSituazioniRecordTitle(record.text.toLowerCase()))
      situazioniTitleRecord.push(record);
  });

  // for each situazioni title let's build a situazione visura, extracting data for each tabla
  situazioniTitleRecord.forEach((titleRecord, index) => {
    const getSituazioneDate = () => {
      // Extract date of the situazione (dd/mm/yy o dd/mm/yyyy)
      const match = titleRecord.text.match(/(\d{2})\/(\d{2})\/(\d{2,4})/);

      if (match) {
        const [, day, month, yearRaw] = match;

        const year =
          yearRaw.length === 2
            ? parseInt(yearRaw, 10) > 30
              ? "19" + yearRaw
              : "20" + yearRaw
            : yearRaw;

        const date = new Date(`${year}-${month}-${day}`);

        return date;
      }
    };

    const getRelevanSituazioneRecords = () => {
      const startRow = titleRecord.y;
      const endRow = situazioniTitleRecord[index + 1]?.y ?? 9999999;

      const relevantRecordFromSituazione: pdfToRawTextDataRes[] =
        rawData.filter((record) => record.y >= startRow && record.y <= endRow);

      return relevantRecordFromSituazione;
    };

    const getDataFromRecordColumn = (
      columnName: string,
      relevantRecordFromSituazione: pdfToRawTextDataRes[]
    ) => {
      // extract data from relevant records (find type first)
      const colRecord = relevantRecordFromSituazione.find((record) =>
        record.text.toLocaleLowerCase().includes(columnName)
      );

      if (colRecord) {
        const foglioColData = relevantRecordFromSituazione.filter((record) => {
          const posCondition =
            record.y > colRecord.y &&
            isWithinDelta(record.avgX, colRecord.avgX, 5);

          const valueCondition =
            record.text && record.text.split(" ").length === 1;

          return posCondition && valueCondition;
        });

        return foglioColData;
      }

      return [];
    };

    const getRendita = (
      relevantRecordFromSituazione: pdfToRawTextDataRes[]
    ) => {
      const renditaRecord = relevantRecordFromSituazione.find((record) =>
        record.text.toLowerCase().includes("euro")
      );

      if (renditaRecord) {
        const rendita = parseFloat(
          renditaRecord.text
            .toLowerCase()
            .replace("euro ", "")
            .replace(".", "")
            .replace(",", ".")
        );

        return isNaN(rendita) ? 0 : rendita;
      }
      return 0;
    };

    const getUnità = (
      foglioColRecord: pdfToRawTextDataRes[],
      particellaColRecord: pdfToRawTextDataRes[],
      subColRecord: pdfToRawTextDataRes[]
    ) => {
      const rowUnitàUnique = [
        ...new Set([
          ...foglioColRecord.map((e) => e.y),
          ...particellaColRecord.map((e) => e.y),
          ...subColRecord.map((e) => e.y),
        ]),
      ].sort();

      const unità: iUnitàVisura[] = rowUnitàUnique.map((rowUnità) => {
        const foglio = foglioColRecord.find((e) => e.y === rowUnità)?.text;
        const particella = particellaColRecord.find(
          (e) => e.y === rowUnità
        )?.text;
        const sub = subColRecord.find((e) => e.y === rowUnità)?.text;

        return { foglio, particella, sub };
      });

      return unità;
    };

    const getSituazioneType = (
      relevantRecordFromSituazione: pdfToRawTextDataRes[]
    ) => {
      for (let i = 0; i < relevantRecordFromSituazione.length; i++) {
        const record = relevantRecordFromSituazione[i];

        const text = record.text.toLowerCase();

        if (text.includes("valida") && text.includes("rendita"))
          return SITUAZIONE_TYPE.RenditaValidata;

        if (text.includes("rettific") && text.includes("rendita"))
          return SITUAZIONE_TYPE.RenditaRettificata;

        if (text.includes("propost") && text.includes("rendita"))
          return SITUAZIONE_TYPE.RenditaProposta;

        if (
          text.includes("non") &&
          text.includes("rettific") &&
          text.includes("rendita")
        )
          return SITUAZIONE_TYPE.RenditaNonRettificata;
      }
    };

    // get relevant record only, keep all the row records releval to the situazione
    const sRecords = getRelevanSituazioneRecords();

    // extract column data given column name
    const date = getSituazioneDate();
    const foglioColRecord = getDataFromRecordColumn("foglio", sRecords);
    const particellaColRecord = getDataFromRecordColumn("particella", sRecords);
    const subColRecord = getDataFromRecordColumn("sub", sRecords);
    const unità = getUnità(foglioColRecord, particellaColRecord, subColRecord);
    const rendita = getRendita(sRecords);
    const categoria = getDataFromRecordColumn("categoria", sRecords)[0]?.text;
    const situazioneType = getSituazioneType(sRecords);

    const situa: iSituazioneVisura = {
      dal: date,
      unità,
      categoria,
      rendita: rendita,
      type: situazioneType,
    };

    situazioni.push(situa);
  });

  return situazioni;
}

export function parseRawDataToSituazioniVisura(
  rawData: pdfToRawTextDataRes[]
): iVisura {
  // get the visura number
  let numero = getVisuraNumberFromRawData(rawData);

  // get the situazioni
  const situazioni = getSituazioniFromRawData(rawData);

  return { numero, situazioni };
}

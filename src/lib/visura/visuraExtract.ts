import type { pdfToRawTextDataRes } from "../pdf";
import { isWithinDelta } from "../utils";
import {
  type iSituazioneVisura,
  type iUnitàVisura,
  SITUAZIONE_TYPE,
  type iVisura,
  IMMOBILE_TYPE,
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

function getComuneAndCodiceFromRawData(rawData: pdfToRawTextDataRes[]): {
  comune: string;
  codice: string;
} {
  let comune = "";
  let codice = "";

  const textRaw = rawData.find((e) =>
    e.text.toLowerCase().includes("comune di")
  );

  const comuneRawText = textRaw?.text;

  if (comuneRawText) {
    const match = comuneRawText.match(
      /Comune di\s+([\wÀ-Ù\s']+)\s*\(\s*Codice\s*:\s*([A-Z0-9]+)\s*\)/i
    );

    if (match) {
      comune = match[1].trim();
      codice = match[2].trim();
    }
  }

  return { comune, codice };
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
    const getRelevanSituazioneRecords = () => {
      const startRow = titleRecord.y;
      const endRow = situazioniTitleRecord[index + 1]?.y ?? 9999999;

      const relevantRecordFromSituazione: pdfToRawTextDataRes[] =
        rawData.filter((record) => record.y >= startRow && record.y <= endRow);

      return relevantRecordFromSituazione;
    };

    const getDataFromRecordColumn = (
      columnName: string,
      relevantRecordFromSituazione: pdfToRawTextDataRes[],
      maxLength: number = 1,
      offset: number = 5
    ) => {
      // extract data from relevant records (find type first)
      const colRecord = relevantRecordFromSituazione.find((record) =>
        record.text.toLocaleLowerCase().includes(columnName)
      );

      if (colRecord) {
        const foglioColData = relevantRecordFromSituazione.filter((record) => {
          const posCondition =
            record.y > colRecord.y &&
            isWithinDelta(record.avgX, colRecord.avgX, offset);

          const valueCondition =
            record.text && record.text.split(" ").length <= maxLength;

          return posCondition && valueCondition;
        });

        return foglioColData;
      }

      return [];
    };

    const getSituazioneDate = (
      titleRecord: pdfToRawTextDataRes,
      relevantRecordFromSituazione: pdfToRawTextDataRes[]
    ) => {
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

      const noteRecord = getDataFromRecordColumn(
        "derivanti",
        relevantRecordFromSituazione,
        100
      );
      const noteText = noteRecord.map((r) => r.text).join(" ");
      const match2 = noteText.match(/\b(\d{2})\/(\d{2})\/(\d{2,4})\b/);

      if (match2) {
        const [, day, month, yearRaw] = match2;

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

    const getImmobileType = (
      relevantRecordFromSituazione: pdfToRawTextDataRes[],
      categoria?: string
    ) => {
      if (categoria) return IMMOBILE_TYPE.Fabbricato;

      for (let i = 0; i < relevantRecordFromSituazione.length; i++) {
        const record = relevantRecordFromSituazione[i];

        if (record.text.toLowerCase().includes("dominicale"))
          return IMMOBILE_TYPE.TerrenoAgricolo;
      }

      return IMMOBILE_TYPE.TerrenoEdificabile;
    };

    // get relevant record only, keep all the row records releval to the situazione
    const sRecords = getRelevanSituazioneRecords();

    // extract column data given column name
    const date = getSituazioneDate(titleRecord, sRecords);
    const foglioColRecord = getDataFromRecordColumn("foglio", sRecords);
    const particellaColRecord = getDataFromRecordColumn("particella", sRecords);
    const subColRecord = getDataFromRecordColumn("sub", sRecords);
    const unità = getUnità(foglioColRecord, particellaColRecord, subColRecord);
    const rendita = getRendita(sRecords);
    const situazioneType = getSituazioneType(sRecords);

    const categoria = getDataFromRecordColumn("categoria", sRecords, 2)[0]
      ?.text;
    const immobileType = getImmobileType(sRecords, categoria);

    const situa: iSituazioneVisura = {
      dal: date,
      unità,
      categoria,
      rendita: rendita,
      type: situazioneType,
      immobileType,
    };

    if (
      situa.dal ||
      situa.categoria ||
      situa.rendita ||
      situa.type ||
      situa.unità?.length
    )
      situazioni.push(situa);
  });

  return situazioni;
}

export function parseRawDataToSituazioniVisura(
  rawData: pdfToRawTextDataRes[]
): iVisura {
  // get the visura number
  const numero = getVisuraNumberFromRawData(rawData);

  // get the comune
  const { comune, codice } = getComuneAndCodiceFromRawData(rawData);

  // get the situazioni
  const situazioni = getSituazioniFromRawData(rawData);

  return { numero, situazioni, comune, codiceComune: codice };
}

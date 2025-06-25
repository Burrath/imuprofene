import type { pdfToRawTextDataRes } from "../../../../main/lib/pdf";
import { isWithinDelta } from "../utils";
import { RAW_FILE_TYPE } from "./fileExtract";

import {
  type iSituazioneVisura,
  type iUnitàVisura,
  SITUAZIONE_TYPE,
  type iVisura,
  IMMOBILE_TYPE,
} from "./visuraInterfaces";

function getVisuraNumberFromRawDataV1(rawData: pdfToRawTextDataRes[]): string {
  let numero = "";

  const nVisuraSlot = rawData.find((e) =>
    e.text.toLowerCase().includes("visura n")
  );
  const nVisuraRawText = nVisuraSlot?.text;
  const nVisuraMatch = nVisuraRawText?.match(/Visura\s+n\.\:\s*([A-Z]?\d+)/);
  if (nVisuraMatch) numero = nVisuraMatch[1];

  return numero;
}

function getVisuraNumberFromRawDataV2(rawData: pdfToRawTextDataRes[]): string {
  const nVisuraTitleSlot = rawData.find((e) =>
    e.text.toLowerCase().includes("numero pratica")
  );
  if (!nVisuraTitleSlot) return "";

  const nVisuraTextSlot = rawData.find(
    (e) =>
      e.y === nVisuraTitleSlot.y &&
      e.startX > nVisuraTitleSlot.endX &&
      e.text.trim()
  );

  return nVisuraTextSlot?.text ?? "";
}

function getComuneAndCodiceFromRawDataV1(rawData: pdfToRawTextDataRes[]): {
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
function getComuneAndCodiceFromRawDataV2(rawData: pdfToRawTextDataRes[]): {
  comune: string;
  codice: string;
} {
  const titleSlot = rawData.find((e) =>
    e.text.toLowerCase().includes("comune di")
  );

  if (!titleSlot) return { comune: "", codice: "" };

  const comuneSlot = rawData.find(
    (e) => e.y === titleSlot.y && e.startX > titleSlot.endX && e.text.trim()
  );

  if (!comuneSlot) return { comune: "", codice: "" };

  const match = comuneSlot.text.match(/^(.+?) \((\w\d{3})\)/);

  if (!match) return { comune: "", codice: "" };

  const [, comune, codice] = match;
  return { comune, codice };
}

function getSituazioniFromRawDataV1(
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
      offset: number = 1
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
            .replace(/\./g, "") // rimuove tutti i punti
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
      situa.dal &&
      (situa.categoria || situa.rendita || situa.type || situa.unità?.length)
    )
      situazioni.push(situa);
  });

  return situazioni;
}

function getSituazioniFromRawDataV2(
  rawData: pdfToRawTextDataRes[]
): iSituazioneVisura[] {
  const situazioni: iSituazioneVisura[] = [];

  const getRelevantSlots = (rawData: pdfToRawTextDataRes[]) => {
    const recordIndex = rawData.findIndex((e) =>
      e.text.toLowerCase().includes("dati di classamento")
    );

    if (recordIndex === -1) return [];

    const reference = rawData[recordIndex];
    const referenceHeight = reference.height;

    // Cerca il secondo record con stesso height, dopo il primo
    const secondIndexRelative = rawData
      .slice(recordIndex + 1)
      .findIndex((e) => e.height === referenceHeight);

    // Calcola l'indice assoluto
    const secondIndex =
      secondIndexRelative !== -1
        ? recordIndex + 1 + secondIndexRelative
        : rawData.length;

    // Prendi i record tra i due (escludendo primo e secondo)
    const sRecords = rawData.slice(recordIndex + 1, secondIndex);

    return sRecords.filter((r) => r.text.trim());
  };

  const getSituazioniSlots = (situazioni: pdfToRawTextDataRes[]) => {
    const regex = /^dal\s\d{2}\/\d{2}\/\d{4}/i;
    const blocks: pdfToRawTextDataRes[][] = [];

    let currentBlock: pdfToRawTextDataRes[] = [];
    for (let i = 0; i < situazioni.length; i++) {
      const s = situazioni[i];

      if (regex.test(s.text)) {
        // se c'è già un blocco in corso, lo chiudo e ne inizio uno nuovo
        if (currentBlock.length > 0) {
          blocks.push(currentBlock);
          currentBlock = [];
        }
      }

      currentBlock.push(s);
    }

    // aggiungi l'ultimo blocco se non vuoto
    if (currentBlock.length > 0) {
      blocks.push(currentBlock);
    }

    return blocks;
  };

  const relevantSlots = getRelevantSlots(rawData);
  const situazioniSlots = getSituazioniSlots(relevantSlots);

  situazioniSlots.forEach((sRecords) => {
    if (!sRecords.length) return;

    const getSituazioneDate = (sRecords: pdfToRawTextDataRes[]) => {
      if (!sRecords[0]?.text) return;

      // Regex con gruppi per giorno, mese e anno
      const match = sRecords[0].text.match(/^dal\s(\d{2})\/(\d{2})\/(\d{4})/i);
      if (!match) return;

      const [, day, month, year] = match;

      // Costruisco la data in formato ISO yyyy-mm-dd (che Date accetta)
      return new Date(`${year}-${month}-${day}`);
    };

    const getUnità = (sRecords: pdfToRawTextDataRes[]) => {
      const unità: iUnitàVisura[] = [];

      const linesY = sRecords
        .filter((e) => e.text.toLowerCase().trim() === "foglio")
        .map((e) => e.y);

      linesY.forEach((y) => {
        const lineRecords = sRecords.filter((e) => e.y === y);

        const foglioIndex = lineRecords.findIndex(
          (e) => e.text.toLowerCase().trim() === "foglio"
        );
        const foglio =
          foglioIndex !== -1 ? lineRecords[foglioIndex + 1] : undefined;

        const particellaIndex = lineRecords.findIndex(
          (e) => e.text.toLowerCase().trim() === "particella"
        );
        const particella =
          particellaIndex !== -1 ? lineRecords[particellaIndex + 1] : undefined;

        const subalternoIndex = lineRecords.findIndex(
          (e) => e.text.toLowerCase().trim() === "subalterno"
        );
        const subalterno =
          subalternoIndex !== -1 ? lineRecords[subalternoIndex + 1] : undefined;

        unità.push({
          foglio: foglio?.text,
          particella: particella?.text,
          sub: subalterno?.text,
        });
      });

      return unità;
    };

    const getCategoria = (sRecords: pdfToRawTextDataRes[]) => {
      const catLineIndex = sRecords.findIndex(
        (e) => e.text.toLowerCase().trim() === "categoria"
      );
      if (catLineIndex !== -1) {
        const cat = sRecords[catLineIndex + 1].text;
        return cat;
      }
    };

    const getRendita = (sRecords: pdfToRawTextDataRes[]) => {
      const renditaRecord = sRecords.find((record) =>
        record.text.toLowerCase().includes("euro")
      );

      if (renditaRecord) {
        const rendita = parseFloat(
          renditaRecord.text
            .toLowerCase()
            .replace("euro ", "")
            .replace(/\./g, "") // rimuove tutti i punti
            .replace(",", ".")
        );

        return isNaN(rendita) ? 0 : rendita;
      }
      return 0;
    };

    const getSituazioneType = (
      sRecords: pdfToRawTextDataRes[]
    ): SITUAZIONE_TYPE | undefined => {
      const annotazioniColX = sRecords.find((e) =>
        e.text.toLowerCase().includes("annotazioni:")
      )?.startX;

      if (annotazioniColX) {
        const relevantRecords = sRecords.filter(
          (e) => e.startX >= annotazioniColX
        );
        const text = relevantRecords
          .map((r) => r.text)
          .join(" ")
          .toLowerCase();

        if (text.includes("rendita non rettific"))
          return SITUAZIONE_TYPE.RenditaNonRettificata;

        if (text.includes("rendita rettific"))
          return SITUAZIONE_TYPE.RenditaRettificata;

        if (text.includes("rendita propost"))
          return SITUAZIONE_TYPE.RenditaProposta;

        if (text.includes("rendita valida"))
          return SITUAZIONE_TYPE.RenditaValidata;
      }
    };

    const getImmobileType = (
      sRecords: pdfToRawTextDataRes[],
      categoria?: string
    ): IMMOBILE_TYPE => {
      if (categoria) return IMMOBILE_TYPE.Fabbricato;

      for (let i = 0; i < sRecords.length; i++) {
        const record = sRecords[i];

        if (record.text.toLowerCase().includes("dominicale"))
          return IMMOBILE_TYPE.TerrenoAgricolo;
      }

      return IMMOBILE_TYPE.TerrenoEdificabile;
    };

    const date = getSituazioneDate(sRecords);
    const unità = getUnità(sRecords);
    const categoria = getCategoria(sRecords);
    const situazioneType = getSituazioneType(sRecords);
    const immobileType = getImmobileType(sRecords, categoria);
    const rendita = getRendita(sRecords);

    const situa: iSituazioneVisura = {
      dal: date,
      unità: unità,
      categoria: categoria,
      rendita: rendita,
      type: situazioneType,
      immobileType: immobileType,
    };

    if (
      situa.dal &&
      (situa.categoria || situa.rendita || situa.type || situa.unità?.length)
    )
      situazioni.push(situa);
  });

  return situazioni.reverse();
}

export function parseRawDataToSituazioniVisura(
  rawData: pdfToRawTextDataRes[],
  rawFileType: RAW_FILE_TYPE
): iVisura {
  if (rawFileType === RAW_FILE_TYPE.visura_v1) {
    const numero = getVisuraNumberFromRawDataV1(rawData);
    const { comune, codice } = getComuneAndCodiceFromRawDataV1(rawData);
    const situazioni = getSituazioniFromRawDataV1(rawData);

    return { numero, situazioni, comune, codiceComune: codice };
  }

  if (rawFileType === RAW_FILE_TYPE.visura_v2) {
    const numero = getVisuraNumberFromRawDataV2(rawData);
    const { comune, codice } = getComuneAndCodiceFromRawDataV2(rawData);
    const situazioni = getSituazioniFromRawDataV2(rawData);

    return { numero, situazioni, comune, codiceComune: codice };
  }

  return {
    numero: "",
    situazioni: [],
    comune: "",
    codiceComune: "",
  };
}

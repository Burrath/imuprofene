import type { pdfToRawTextDataRes } from "../../../../main/lib/pdf";

export enum RAW_FILE_TYPE {
  visura_v1 = "visura_v1", // classica tabellare
  visura_v2 = "visura_v2", // testuale storica
  visura_v3 = "visura_v3", // testuale attuale
  visura_v4 = "visura_v4", // testuale attuale soppresso

  f24_v1 = "f24_v1", // classico da pagamento
  f24_v2 = "f24_v2", // a lista
}

export default function getRawFileType(
  rawData: pdfToRawTextDataRes[]
): RAW_FILE_TYPE {
  for (let i = 0; i < rawData.length; i++) {
    const data = rawData[i];

    if (data.text.toLowerCase().includes("visura n"))
      return RAW_FILE_TYPE.visura_v1;
    if (data.text.toLowerCase().includes("numero pratica")) {
      if (
        rawData.find((e) =>
          e.text.toLowerCase().includes("visura attuale per immobile soppresso")
        )
      )
        return RAW_FILE_TYPE.visura_v4;
      if (
        rawData.find((e) =>
          e.text.toLowerCase().includes("visura storica per immobile")
        )
      )
        return RAW_FILE_TYPE.visura_v2;
      if (
        rawData.find((e) =>
          e.text.toLowerCase().includes("visura attuale per immobile")
        )
      )
        return RAW_FILE_TYPE.visura_v3;
    }

    if (data.text.toLowerCase().includes("f24")) return RAW_FILE_TYPE.f24_v1;
    if (data.text.toLowerCase().includes("estremi del versamento"))
      return RAW_FILE_TYPE.f24_v2;
  }

  return RAW_FILE_TYPE.visura_v1;
}

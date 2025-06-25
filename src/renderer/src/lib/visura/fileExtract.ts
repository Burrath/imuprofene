import type { pdfToRawTextDataRes } from "../../../../main/lib/pdf";

export enum RAW_FILE_TYPE {
  visura_v1 = "visura_v1",
  visura_v2 = "visura_v2",
  f24_v1 = "f24_v1",
  f24_v2 = "f24_v2",
}

export default function getRawFileType(
  rawData: pdfToRawTextDataRes[]
): RAW_FILE_TYPE {
  for (let i = 0; i < rawData.length; i++) {
    const data = rawData[i];

    if (data.text.toLowerCase().includes("visura n"))
      return RAW_FILE_TYPE.visura_v1;
    if (data.text.toLowerCase().includes("numero pratica"))
      return RAW_FILE_TYPE.visura_v2;
    if (data.text.toLowerCase().includes("f24")) return RAW_FILE_TYPE.f24_v1;
    if (data.text.toLowerCase().includes("estremi del versamento"))
      return RAW_FILE_TYPE.f24_v2;
  }

  return RAW_FILE_TYPE.visura_v1;
}

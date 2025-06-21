import type { pdfToRawTextDataRes } from "../pdf";

export enum FILE_TYPE {
  visura_v1 = "visura_v1",
  visura_v2 = "visura_v2",
  f24 = "f24",
}

export default function getFileType(rawData: pdfToRawTextDataRes[]): FILE_TYPE {
  for (let i = 0; i < rawData.length; i++) {
    const data = rawData[i];

    if (data.text.toLowerCase().includes("visura n"))
      return FILE_TYPE.visura_v1;
    if (data.text.toLowerCase().includes("numero pratica"))
      return FILE_TYPE.visura_v2;
  }

  return FILE_TYPE.visura_v1;
}

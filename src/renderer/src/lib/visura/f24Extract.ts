import type { pdfToRawTextDataRes } from "../../../../main/lib/pdf";
import type { iF24 } from "./f24Interfaces";
import { RAW_FILE_TYPE } from "./fileExtract";

function extractF24Data_v2(rawData: pdfToRawTextDataRes[]): iF24 {
  // console.log(rawData.find((e) => e.text.toLowerCase().includes("versamento")));

  return {};
}

export default function parseDataFromF24RawData(
  rawData: pdfToRawTextDataRes[],
  rawFileType: RAW_FILE_TYPE
): iF24 {
  console.log(rawData.map((e) => e.text));

  if (rawFileType === RAW_FILE_TYPE.f24_v2) return extractF24Data_v2(rawData);
  return {};
}

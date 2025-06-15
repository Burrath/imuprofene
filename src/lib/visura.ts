import type { pdfToRawTextDataRes } from "./pdf";

export interface iUnitàVisura {
  foglio: string;
  particella: string;
  sub: string;
  categoria: string;
}

export interface iSituazioneVisura {
  dal: Date;

  unità: iUnitàVisura[];

  reddito: number;
}

export interface iVisura {
  numero: string;
  situazioni: iSituazioneVisura[];
}

export function parseRawDataToSituazioniVisura(
  rawData: pdfToRawTextDataRes[]
): iVisura {
  // get the visura number
  let numero = "";

  const nVisuraSlot = rawData.find((e) =>
    e.text.toLowerCase().includes("visura n")
  );
  const nVisuraRawText = nVisuraSlot?.text;
  const nVisuraMatch = nVisuraRawText?.match(/Visura\s+n\.\:\s*([A-Z]?\d+)/);
  if (nVisuraMatch) numero = nVisuraMatch[1];

  const situazioni: iSituazioneVisura[] = [];

  return { numero, situazioni };
}

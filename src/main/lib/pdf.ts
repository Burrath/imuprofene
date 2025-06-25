import PDFParser from "pdf2json";

interface PDF2JSONTexts {
  x: number;
  y: number;
  w?: number;
  h?: number;
  R: Array<{ T: string; TS: number[] }>;
}

export interface pdfToRawTextDataRes {
  page: number;
  text: string;
  startX: number;
  endX: number;
  avgX: number;
  y: number;
  height: number;
  raw: PDF2JSONTexts;
}

interface PDF2JSONOutput {
  Transcoder: string;
  Meta: Record<string, any>;
  Pages: PDF2JSONPage[];
}

interface PDF2JSONPage {
  Width: number;
  Height: number;
  Texts: Array<PDF2JSONTexts>;
}

export async function pdfToRawTextData(
  arrayBuffer: ArrayBuffer
): Promise<pdfToRawTextDataRes[]> {
  const pdfParser = new PDFParser();

  const data = await new Promise<PDF2JSONOutput>((resolve, reject) => {
    pdfParser.on("pdfParser_dataReady", (pdfData) =>
      resolve(pdfData as PDF2JSONOutput)
    );
    pdfParser.on("pdfParser_dataError", (err) => reject(err));
    pdfParser.parseBuffer(Buffer.from(arrayBuffer));
  });

  const result: pdfToRawTextDataRes[] = [];

  for (let pageIndex = 0; pageIndex < data.Pages.length; pageIndex++) {
    const page = data.Pages[pageIndex];
    const pageNum = pageIndex + 1;
    const pageHeight = page.Height;

    for (const textItem of page.Texts) {
      const rawText = textItem.R?.[0]?.T;
      if (!rawText) continue;

      const text = decodeURIComponent(rawText);
      const startX = textItem.x;
      const estimatedWidth = rawText.length * 0.1857;
      const estimatedHeight = Number(textItem.R[0].TS[1]) / 10;
      const endX = startX + estimatedWidth;
      const avgX = (startX + endX) / 2;

      // Converti Y per avere origine in alto, come pdf.js, poi somma offset pagina
      const finalY = textItem.y + pageNum * pageHeight;

      result.push({
        page: pageNum,
        text,
        startX,
        endX,
        avgX,
        y: finalY,
        height: estimatedHeight,
        raw: textItem,
      });
    }
  }

  const orderedRes = result.sort((a, b) => {
    if (a.y !== b.y) {
      return a.y - b.y;
    }
    return a.startX - b.startX;
  });

  return orderedRes;
}

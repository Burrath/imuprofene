import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// Imposta il worker
// import pkg from "pdfjs-dist/package.json";
// GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pkg.version}/build/pdf.worker.min.mjs`;
GlobalWorkerOptions.workerSrc = `/pdf-js-worker.js`;

export interface pdfToRawTextDataRes {
  page: number;
  text: string;
  startX: number;
  endX: number;
  avgX: number;
  y: number;
  height: number;
}

export async function pdfToRawTextData(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  const result: pdfToRawTextDataRes[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 }); // ottieni altezza della pagina
    const pageHeight = viewport.height;

    for (const item of content.items as any[]) {
      const transform = item.transform; // [a, b, c, d, e, f]
      const x = transform[4];
      const y = transform[5];

      const startX = x;
      const endX = x + item.width;
      const avgX = (startX + endX) / 2;
      const invertedY = pageHeight - y;

      result.push({
        page: pageNum,
        text: item.str,
        startX,
        endX,
        avgX,
        y: invertedY + pageNum * pageHeight,
        height: item.height, // <-- aggiunta qui
      });
    }
  }

  return result;
}

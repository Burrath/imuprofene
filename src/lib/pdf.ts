import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";

// Imposta il worker
// import pkg from "pdfjs-dist/package.json";
// GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pkg.version}/build/pdf.worker.min.mjs`;
GlobalWorkerOptions.workerSrc = `http://localhost:5173/pdf-js-worker.js`;

export interface pdfToRawTextDataRes {
  page: number;
  text: string;
  startX: number;
  endX: number;
  avgX: number;
  y: number;
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

    for (const item of content.items as any[]) {
      const transform = item.transform; // [a, b, c, d, e, f]
      const x = transform[4];
      const y = transform[5];

      if (!item.str || !item.str.trim()) continue;

      const startX = x;
      const endX = x + item.width; // width from PDF rendering
      const avgX = (startX + endX) / 2;

      result.push({
        page: pageNum,
        text: item.str,
        startX,
        endX,
        avgX,
        y,
      });
    }
  }

  return result;
}

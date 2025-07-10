import { DroppedFile } from "@renderer/App";
import { iUnitàVisura } from "../lib/visura/visuraInterfaces";
import { formatNumberIT } from "@renderer/lib/utils";
import { ReactElement } from "react";
import { Button } from "./ui/button";
import { PdfModal } from "./PdfModal";
import { Eye } from "lucide-react";
import ExcelDownloadButton, { ExcelSheets } from "./ExcelDownloadButton";

export default function Census({
  droppedFiles,
  setModalContent,
}: {
  droppedFiles: DroppedFile[];
  setModalContent: (el: ReactElement) => void;
}) {
  const uniqueUnitsMap = new Map<
    string,
    {
      unità: iUnitàVisura;
      categorie: Set<string>;
      rendita: number;
      renditaData?: Date;
      file: DroppedFile;
    }
  >();

  droppedFiles.forEach((file) => {
    const situazioni = file.refinedVisuraData?.situazioni ?? [];

    situazioni.forEach((situazione) => {
      const unitàList = situazione.unità ?? [];
      unitàList.forEach((unità) => {
        const key = `${unità.foglio ?? ""}-${unità.particella ?? ""}-${unità.sub ?? ""}`;

        if (!uniqueUnitsMap.has(key)) {
          uniqueUnitsMap.set(key, {
            unità,
            categorie: new Set(),
            rendita: situazione.rendita ?? 0,
            renditaData: situazione.dal ? new Date(situazione.dal) : undefined,
            file: file,
          });
          if (situazione.categoria) {
            uniqueUnitsMap.get(key)!.categorie.add(situazione.categoria);
          }
          return;
        }

        const existing = uniqueUnitsMap.get(key)!;

        if (situazione.categoria) {
          existing.categorie.add(situazione.categoria);
        }

        const nuovaData = situazione.dal ? new Date(situazione.dal) : undefined;

        if (
          nuovaData &&
          (!existing.renditaData || nuovaData > existing.renditaData)
        ) {
          existing.rendita = situazione.rendita ?? 0;
          existing.renditaData = nuovaData;
        }
      });
    });
  });

  const rows = Array.from(uniqueUnitsMap.values());

  const sheets: ExcelSheets = {};
  sheets.perimetro = rows.map((row) => {
    return {
      file: row.file.file?.name ?? "",
      foglio: row.unità.foglio ?? "",
      particella: row.unità.particella ?? "",
      sub: row.unità.sub ?? "",
      categorie: [...row.categorie].join(", "),
      "Rendita - Dominicale - Venale": row.rendita,
    };
  });

  return (
    <div className="text-sm mt-4">
      <div className="flex">
        <h2 className="font-semibold text-lg mb-2">Perimetro immobili</h2>
        <ExcelDownloadButton
          sheets={sheets}
          fileName={`perimetro_${new Date().getTime()}.xlsx`}
        />
      </div>

      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">File</th>
            <th className="border px-2 py-1">Foglio</th>
            <th className="border px-2 py-1">Particella</th>
            <th className="border px-2 py-1">Sub</th>
            <th className="border px-2 py-1">Categorie</th>
            <th className="border px-2 py-1">Rendita - Dominicale - Venale</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={index}>
              <td className="border px-2 py-1">
                {row.file.file?.name}
                {!!row.file.file?.arrayBuffer && (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!row.file.file.arrayBuffer}
                    onClick={() =>
                      setModalContent(<PdfModal pdf={row.file.file!} />)
                    }
                  >
                    <Eye />
                  </Button>
                )}
              </td>
              <td className="border px-2 py-1">{row.unità.foglio ?? ""}</td>
              <td className="border px-2 py-1">{row.unità.particella ?? ""}</td>
              <td className="border px-2 py-1">{row.unità.sub ?? ""}</td>
              <td className="border px-2 py-1">
                {[...row.categorie].join(", ")}
              </td>
              <td className="border px-2 py-1">
                € {formatNumberIT(row.rendita)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

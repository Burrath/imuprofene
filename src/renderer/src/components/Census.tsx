import { DroppedFile } from "@renderer/App";
import { iUnitàVisura } from "../lib/visura/visuraInterfaces";
import { formatNumberIT } from "@renderer/lib/utils";
import { ReactElement } from "react";
import { Button } from "./ui/button";
import { PdfModal } from "./PdfModal";
import { Eye } from "lucide-react";

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
            rendita: 0,
            file: file,
          });
        }

        const existing = uniqueUnitsMap.get(key)!;

        if (situazione.categoria) {
          existing.categorie.add(situazione.categoria);
        }

        if (situazione.rendita) {
          existing.rendita += situazione.rendita;
        }
      });
    });
  });

  const rows = Array.from(uniqueUnitsMap.values());

  return (
    <div className="text-sm mt-4">
      <h2 className="font-semibold text-lg mb-2">Censimento aggregato</h2>
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
                {row.file.file.name}
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!row.file.file.arrayBuffer}
                  onClick={() =>
                    setModalContent(<PdfModal pdf={row.file.file} />)
                  }
                >
                  <Eye />
                </Button>
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

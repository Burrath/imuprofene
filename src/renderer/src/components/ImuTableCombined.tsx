import { ArrowUpRight, Eye, X } from "lucide-react";
import { formatNumberIT } from "../lib/utils";

import type { DroppedFile } from "../App";
import { CopyPopover } from "./CopyPopover";
import { Button } from "./ui/button";
import { ReactElement, useEffect, useState } from "react";
import { PdfModal } from "./PdfModal";

export function ImuTableCombined({
  droppedFiles,
  minYear,
  onSelect,
  setModalContent,
}: {
  droppedFiles: DroppedFile[];
  minYear?: number;
  onSelect: (fileId: string) => void;
  setModalContent: (el: ReactElement) => void;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1990 + 1 },
    (_, i) => 1990 + i
  ).reverse();

  const [visuraFiles, setVisuraFiles] = useState<DroppedFile[]>([]);
  const [f24Files, setF24files] = useState<DroppedFile[]>([]);
  const [year, setYear] = useState<number>(currentYear);

  useEffect(() => {
    setVisuraFiles(droppedFiles.filter((f) => f.fileType === "visura"));
    setF24files(droppedFiles.filter((f) => f.fileType === "f24"));
  }, [droppedFiles]);

  const getF24FromComuneAndPeriod = (codiceComune: string, year: string) => {
    const res = f24Files.filter(
      (e) =>
        e.f24Data?.voci?.find((v) => v.codice === codiceComune) &&
        e.f24Data?.voci?.find((v) => v.periodo?.includes(year))
    );

    return res;
  };

  const getVisureGroupedByComune = (files: DroppedFile[]) => {
    const groupedByComune = files.reduce(
      (acc, file) => {
        const codiceComune =
          file.refinedVisuraData?.codiceComune || "Comune sconosciuto";
        if (!acc[codiceComune]) acc[codiceComune] = [];
        acc[codiceComune].push(file);
        return acc;
      },
      {} as Record<string, DroppedFile[]>
    );

    return groupedByComune;
  };

  // Filtra solo i file che hanno dati per quell'anno
  const filesForYear = visuraFiles.filter((file) => file.imuData?.[year]);
  const groupedByComune = getVisureGroupedByComune(filesForYear);

  return (
    <div className="text-sm w-full">
      <div className="flex gap-3">
        {years.map((y) => {
          if (minYear && y < minYear) return null;

          return (
            <Button
              size={"sm"}
              variant={year === y ? "default" : "outline"}
              disabled={y === year}
              onClick={() => setYear(y)}
              className={`${year === y ? "font-bold" : "font-light text-gray-600"}`}
            >
              {y}
            </Button>
          );
        })}
      </div>

      <br />
      <br />

      <div className="mb-8" key={year}>
        <p className="font-bold text-xl mb-3">{year}</p>

        {Object.entries(groupedByComune).map(([codiceComune, files]) => (
          <div key={codiceComune} className="mb-6">
            <p className="font-semibold text-md mb-1">
              {files[0].refinedVisuraData?.comune} ({codiceComune})
            </p>
            <table className="w-full border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1">File</th>
                  <th className="border px-2 py-1">Categorie</th>
                  <th className="border px-2 py-1">IMU Anticipo</th>
                  <th className="border px-2 py-1">IMU Saldo</th>
                  <th className="border px-2 py-1">IMU</th>
                </tr>
              </thead>
              <tbody>
                {files.map((fileObj) => {
                  const imuData = fileObj.imuData?.[year];
                  if (!imuData) return null;

                  return (
                    <tr key={fileObj.file.name}>
                      <td className="border px-2 py-1">
                        {fileObj.file.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={!fileObj.file.arrayBuffer}
                          onClick={() =>
                            setModalContent(<PdfModal pdf={fileObj.file} />)
                          }
                        >
                          <Eye />
                        </Button>
                        <Button
                          variant={"ghost"}
                          size={"sm"}
                          onClick={() => onSelect(fileObj._id)}
                        >
                          <ArrowUpRight />
                        </Button>
                      </td>

                      <td className="border px-2 py-1">
                        {!imuData.categorie.length ? (
                          <X className="text-red-500 w-4 h-4" />
                        ) : (
                          imuData.categorie.join(" - ")
                        )}
                      </td>
                      <td className="border px-2 py-1 font-semibold">
                        {typeof imuData.imuAnticipo !== "number" ? (
                          <X className="text-red-500 w-4 h-4" />
                        ) : (
                          `€ ${formatNumberIT(imuData.imuAnticipo)}`
                        )}
                      </td>
                      <td className="border px-2 py-1 font-semibold">
                        {typeof imuData.imuSaldo !== "number" ? (
                          <X className="text-red-500 w-4 h-4" />
                        ) : (
                          `€ ${formatNumberIT(imuData.imuSaldo)}`
                        )}
                      </td>
                      <td className="border px-2 py-1 font-semibold">
                        {typeof imuData.imu !== "number" ? (
                          <X className="text-red-500 w-4 h-4" />
                        ) : (
                          `€ ${formatNumberIT(imuData.imu)}`
                        )}
                      </td>
                    </tr>
                  );
                })}

                {/* Totale per comune */}
                <tr className="font-bold bg-gray-50">
                  <td className="border px-2 py-1">Totale</td>
                  <td className="border px-2 py-1" colSpan={1}></td>
                  <td className="border px-2 py-1">
                    €{" "}
                    {formatNumberIT(
                      files.reduce(
                        (sum, file) =>
                          sum + (file.imuData?.[year]?.imuAnticipo ?? 0),
                        0
                      )
                    )}
                    <CopyPopover
                      value={files.reduce(
                        (sum, file) =>
                          sum + (file.imuData?.[year]?.imuAnticipo ?? 0),
                        0
                      )}
                    />
                  </td>
                  <td className="border px-2 py-1">
                    €{" "}
                    {formatNumberIT(
                      files.reduce(
                        (sum, file) =>
                          sum + (file.imuData?.[year]?.imuSaldo ?? 0),
                        0
                      )
                    )}
                    <CopyPopover
                      value={files.reduce(
                        (sum, file) =>
                          sum + (file.imuData?.[year]?.imuSaldo ?? 0),
                        0
                      )}
                    />
                  </td>
                  <td className="border px-2 py-1">
                    €{" "}
                    {formatNumberIT(
                      files.reduce(
                        (sum, file) => sum + (file.imuData?.[year]?.imu ?? 0),
                        0
                      )
                    )}
                    <CopyPopover
                      value={files.reduce(
                        (sum, file) => sum + (file.imuData?.[year]?.imu ?? 0),
                        0
                      )}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
            <br />
            <p className="font-semibold text-md mb-1">F24 Associati</p>

            {!getF24FromComuneAndPeriod(codiceComune, year.toString())
              .length && <p>Non ci sono F24 associati</p>}

            {getF24FromComuneAndPeriod(codiceComune, year.toString()).map(
              (fileObj, key) => (
                <div key={key} className="w-full mb-2">
                  {fileObj.f24Data && (
                    <table className="w-full border border-gray-300 text-sm">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="border px-2 py-1">File</th>
                          <th className="border px-2 py-1">Causale Tributo</th>
                          <th className="border px-2 py-1">Modalità</th>
                          <th className="border px-2 py-1">Importo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fileObj.f24Data.voci?.map((voce, key) => {
                          return (
                            <tr key={key}>
                              <td className="border px-2 py-1">
                                {fileObj.file.name}{" "}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  disabled={!fileObj.file.arrayBuffer}
                                  onClick={() =>
                                    setModalContent(
                                      <PdfModal pdf={fileObj.file} />
                                    )
                                  }
                                >
                                  <Eye />
                                </Button>
                                <Button
                                  variant={"ghost"}
                                  size={"sm"}
                                  onClick={() => onSelect(fileObj._id)}
                                >
                                  <ArrowUpRight />
                                </Button>
                              </td>
                              <td className="border px-2 py-1">
                                {voce.causaleTributo}
                              </td>
                              <td className="border px-2 py-1">
                                {voce.estremi?.saldo ? "SALDO" : ""}{" "}
                                {voce.estremi?.acc ? "ACCONTO" : ""}
                              </td>
                              <td className="border px-2 py-1 font-bold">
                                €{" "}
                                {voce.importoDebito && (
                                  <>
                                    {formatNumberIT(voce.importoDebito)}
                                    <CopyPopover value={voce.importoDebito} />
                                  </>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

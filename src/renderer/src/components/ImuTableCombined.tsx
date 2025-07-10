import { ArrowUpRight, Eye, X } from "lucide-react";
import { formatNumberIT } from "../lib/utils";

import type { DroppedFile } from "../App";
import { CopyPopover } from "./CopyPopover";
import { Button } from "./ui/button";
import { ReactElement, useEffect, useState } from "react";
import { PdfModal } from "./PdfModal";

import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from "lucide-react";
import { Card, CardContent } from "./ui/card";
import ExcelDownloadButton, {
  ExcelRow,
  ExcelSheets,
} from "./ExcelDownloadButton";

export function ImuTableCombined({
  droppedFiles,
  minYear,
  maxYear,
  onSelect,
  setModalContent,
}: {
  droppedFiles: DroppedFile[];
  minYear?: number;
  maxYear?: number;
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
  const [year, setYear] = useState<number>();

  useEffect(() => {
    setVisuraFiles(droppedFiles.filter((f) => f.fileType === "visura"));
    setF24files(droppedFiles.filter((f) => f.fileType === "f24"));
  }, [droppedFiles]);

  const getF24FromComuneAndPeriod = (codiceComune: string, year: string) => {
    const res = f24Files
      .filter((e) =>
        e.f24Data?.voci?.some(
          (v) => v.codice === codiceComune && v.periodo?.includes(year)
        )
      )
      .map((file) => {
        const filteredVoci = file.f24Data?.voci?.filter((v) =>
          v.periodo?.includes(year)
        );

        return {
          ...file,
          f24Data: {
            ...file.f24Data,
            voci: filteredVoci,
          },
        };
      });

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
  const filesForYear = year
    ? visuraFiles.filter((file) => file.imuData?.[year])
    : visuraFiles;
  const groupedByComune = getVisureGroupedByComune(filesForYear);

  const getReportData = () => {
    const report: {
      [year: string]: {
        [codiceComune: string]: {
          comune: string;
          visuraAnticipo: number;
          visuraSaldo: number;
          f24Anticipo: number;
          f24Saldo: number;
        };
      };
    } = {};

    years.forEach((year) => {
      if (year && minYear && year < minYear) return;
      if (year && maxYear && year > maxYear) return;
      report[year] = {};

      Object.entries(groupedByComune).forEach(([codiceComune, files]) => {
        const comune = files[0].refinedVisuraData?.comune ?? "";

        const visuraAnticipo = files.reduce(
          (sum, file) => sum + (file.imuData?.[year]?.imuAnticipo ?? 0),
          0
        );
        const visuraSaldo = files.reduce(
          (sum, file) => sum + (file.imuData?.[year]?.imuSaldo ?? 0),
          0
        );

        const f24 = getF24FromComuneAndPeriod(codiceComune, String(year));

        const allVoci = f24.flatMap((f) => f.f24Data?.voci ?? []);

        const f24Anticipo = allVoci
          .filter((v) => v.estremi?.acc)
          .reduce((sum, v) => sum + (v.importoDebito ?? 0), 0);

        const f24Saldo = allVoci
          .filter((v) => v.estremi?.saldo)
          .reduce((sum, v) => sum + (v.importoDebito ?? 0), 0);

        report[year][codiceComune] = {
          comune,
          visuraAnticipo,
          visuraSaldo,
          f24Anticipo,
          f24Saldo,
        };
      });
    });

    return report;
  };

  const reportData = getReportData();

  const getStatusIcon = (visura: number, f24: number) => {
    if (!visura && !f24)
      return <HelpCircle className="text-gray-400 w-5 h-5" />;
    if (!visura || !f24)
      return <HelpCircle className="text-gray-400 w-5 h-5" />;

    const diff = Math.abs(visura - f24);
    const percentDiff = (diff / Math.max(visura, f24)) * 100;

    if (percentDiff <= 0.5)
      return <CheckCircle className="text-green-600 w-5 h-5" />;
    if (percentDiff <= 2.5)
      return <AlertTriangle className="text-yellow-500 w-5 h-5" />;
    return <XCircle className="text-red-600 w-5 h-5" />;
  };

  const generateSheetsData = (
    reportData: ReturnType<typeof getReportData>,
    visuraFiles: DroppedFile[],
    f24Files: DroppedFile[],
    years: number[]
  ): ExcelSheets => {
    const sheets: ExcelSheets = {};

    // Foglio 1: GENERALE
    const generalSheet: ExcelRow[] = [];

    Object.entries(reportData).forEach(([year, comuni]) => {
      Object.entries(comuni).forEach(([codiceComune, dati]) => {
        generalSheet.push({
          Anno: year,
          Comune: dati.comune,
          "Codice Comune": codiceComune,
          "Visura Anticipo": dati.visuraAnticipo,
          "Visura Saldo": dati.visuraSaldo,
          "F24 Anticipo": dati.f24Anticipo,
          "F24 Saldo": dati.f24Saldo,
        });
      });
    });

    sheets["Generale"] = generalSheet;

    // Fogli per anno
    years.forEach((year) => {
      const righe: ExcelRow[] = [];

      const filesForYear = visuraFiles.filter((file) => file.imuData?.[year]);
      const groupedByComune: Record<string, DroppedFile[]> =
        filesForYear.reduce(
          (acc, file) => {
            const codice =
              file.refinedVisuraData?.codiceComune || "Comune sconosciuto";
            if (!acc[codice]) acc[codice] = [];
            acc[codice].push(file);
            return acc;
          },
          {} as Record<string, DroppedFile[]>
        );

      Object.entries(groupedByComune).forEach(([codiceComune, files]) => {
        const comune = files[0].refinedVisuraData?.comune ?? "";

        files.forEach((file) => {
          const imuData = file.imuData?.[year];
          if (!imuData) return;

          const unità = [
            ...new Map(
              (file.refinedVisuraData?.situazioni ?? [])
                .flatMap((s) => s.unità ?? [])
                .map((u) => [`${u.foglio}-${u.particella}-${u.sub}`, u])
            ).values(),
          ];

          righe.push({
            Comune: comune,
            "Codice Comune": codiceComune,
            File: file.file?.name ?? "",
            "Categorie IMU": imuData.categorie?.join(" - ") || "",
            "IMU Anticipo": imuData.imuAnticipo ?? "",
            "IMU Saldo": imuData.imuSaldo ?? "",
            "IMU Totale": imuData.imu ?? "",
            "Unità (n)": unità.length,
          });
        });

        // Totale visura per comune
        righe.push({
          Comune: comune,
          "Codice Comune": codiceComune,
          File: "Totale visura",
          "IMU Anticipo": files.reduce(
            (s, f) => s + (f.imuData?.[year]?.imuAnticipo ?? 0),
            0
          ),
          "IMU Saldo": files.reduce(
            (s, f) => s + (f.imuData?.[year]?.imuSaldo ?? 0),
            0
          ),
          "IMU Totale": files.reduce(
            (s, f) => s + (f.imuData?.[year]?.imu ?? 0),
            0
          ),
        });

        // F24
        const f24 = f24Files
          .filter((e) =>
            e.f24Data?.voci?.some(
              (v) =>
                v.codice === codiceComune && v.periodo?.includes(String(year))
            )
          )
          .map((file) => {
            const filteredVoci = file.f24Data?.voci?.filter((v) =>
              v.periodo?.includes(String(year))
            );

            return {
              ...file,
              f24Data: {
                ...file.f24Data,
                voci: filteredVoci,
              },
            };
          });

        f24.forEach((file) => {
          (file.f24Data?.voci ?? []).forEach((voce) => {
            righe.push({
              Comune: comune,
              "Codice Comune": codiceComune,
              File: file.file?.name ?? "",
              Causale: voce.causaleTributo ?? "",
              Tipo: voce.estremi?.saldo
                ? "SALDO"
                : voce.estremi?.acc
                  ? "ACCONTO"
                  : "",
              "Importo F24": voce.importoDebito ?? "",
            });
          });
        });

        // Totale F24 per comune
        const f24Anticipo = f24
          .flatMap((f) => f.f24Data?.voci ?? [])
          .filter((v) => v.estremi?.acc)
          .reduce((sum, v) => sum + (v.importoDebito ?? 0), 0);

        const f24Saldo = f24
          .flatMap((f) => f.f24Data?.voci ?? [])
          .filter((v) => v.estremi?.saldo)
          .reduce((sum, v) => sum + (v.importoDebito ?? 0), 0);

        righe.push({
          Comune: comune,
          "Codice Comune": codiceComune,
          File: "Totale F24",
          "Importo F24 Anticipo": f24Anticipo,
          "Importo F24 Saldo": f24Saldo,
        });
      });

      if (righe.length > 0) {
        sheets[`Anno ${year}`] = righe;
      }
    });

    return sheets;
  };

  const sheets = generateSheetsData(reportData, visuraFiles, f24Files, years);

  return (
    <div className="text-sm w-full">
      <div className="flex">
        <h2 className="font-semibold text-lg mb-2">Calcoli agglomerati</h2>
        <ExcelDownloadButton
          sheets={sheets}
          fileName={`calcoli_${new Date().getTime()}.xlsx`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
        {Object.keys(reportData)
          .reverse()
          .map((y) => (
            <Card
              key={y}
              onClick={() =>
                String(year) === y ? setYear(undefined) : setYear(Number(y))
              }
              className={`cursor-pointer hover:bg-gray-100 ${y === String(year) ? "bg-gray-50 shadow-2xl" : ""}`}
            >
              <CardContent>
                <p className="text-xl font-bold mb-4">{y}</p>
                {Object.keys(reportData[y]).map((codiceComune) => {
                  const data = reportData[y][codiceComune];
                  return (
                    <div key={codiceComune} className="mb-4">
                      <p className="text-lg font-semibold mb-1">
                        {data.comune} ({codiceComune})
                      </p>

                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left border">
                          <thead>
                            <tr className="border-b bg-gray-100 text-gray-700 uppercase text-xs">
                              <th className="px-2 py-1 font-medium border">
                                Tipo
                              </th>
                              <th className="px-2 py-1 font-medium border">
                                Visura
                              </th>
                              <th className="px-2 py-1 font-medium border">
                                F24
                              </th>
                              <th className="px-2 py-1 font-medium border"></th>
                            </tr>
                          </thead>
                          <tbody>
                            {["Anticipo", "Saldo"].map((tipo) => {
                              const isAnticipo = tipo === "Anticipo";
                              const f24 = isAnticipo
                                ? data.f24Anticipo
                                : data.f24Saldo;
                              const visura = isAnticipo
                                ? data.visuraAnticipo
                                : data.visuraSaldo;

                              return (
                                <tr
                                  key={tipo}
                                  className="border-b hover:bg-gray-50"
                                >
                                  <td className="px-2 py-1 font-medium text-gray-700 border text-nowrap">
                                    {tipo}
                                  </td>
                                  <td className="px-2 py-1 text-gray-600 border text-nowrap">
                                    € {formatNumberIT(visura)}
                                  </td>
                                  <td className="px-2 py-1 text-gray-600 border text-nowrap">
                                    € {formatNumberIT(f24)}
                                  </td>
                                  <td className="px-2 py-1 border text-nowrap">
                                    {getStatusIcon(visura, f24)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
      </div>

      <br />
      <br />

      {year && (
        <div className="mb-8">
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
                    <th className="border px-2 py-1">Unità</th>
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
                      <tr key={fileObj.file?.name}>
                        <td className="border px-2 py-1">
                          {fileObj.file?.name}
                          {!!fileObj.file?.arrayBuffer && (
                            <Button
                              variant="ghost"
                              size="sm"
                              disabled={!fileObj.file?.arrayBuffer}
                              onClick={() =>
                                setModalContent(
                                  <PdfModal pdf={fileObj.file!} />
                                )
                              }
                            >
                              <Eye />
                            </Button>
                          )}
                          <Button
                            variant={"ghost"}
                            size={"sm"}
                            onClick={() => onSelect(fileObj._id)}
                          >
                            <ArrowUpRight />
                          </Button>
                        </td>

                        <td className="border">
                          {fileObj.refinedVisuraData?.situazioni && (
                            <table className="text-xs w-full">
                              <thead>
                                <tr className="bg-gray-50">
                                  <th className="border px-1 py-1">Foglio</th>
                                  <th className="border px-1 py-1">
                                    Particella
                                  </th>
                                  <th className="border px-1 py-1">Sub</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  ...new Map(
                                    fileObj.refinedVisuraData.situazioni
                                      .flatMap((s) => s.unità ?? [])
                                      .map((u) => [
                                        `${u.foglio}-${u.particella}-${u.sub}`,
                                        u,
                                      ])
                                  ).values(),
                                ].map((u, index) => (
                                  <tr key={index}>
                                    <td className="border px-1 py-1">
                                      {u.foglio ?? ""}
                                    </td>
                                    <td className="border px-1 py-1">
                                      {u.particella ?? ""}
                                    </td>
                                    <td className="border px-1 py-1">
                                      {u.sub ?? ""}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
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
                            <th className="border px-2 py-1">
                              Causale Tributo
                            </th>
                            <th className="border px-2 py-1">Modalità</th>
                            <th className="border px-2 py-1">Importo</th>
                          </tr>
                        </thead>
                        <tbody>
                          {fileObj.f24Data.voci?.map((voce, key) => {
                            return (
                              <tr key={key}>
                                <td className="border px-2 py-1">
                                  {fileObj.file?.name}{" "}
                                  {!!fileObj.file?.arrayBuffer && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={!fileObj.file?.arrayBuffer}
                                      onClick={() =>
                                        setModalContent(
                                          <PdfModal pdf={fileObj.file!} />
                                        )
                                      }
                                    >
                                      <Eye />
                                    </Button>
                                  )}
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
      )}
    </div>
  );
}

import { useState, useRef, useEffect } from "react";
import type { DragEvent, ChangeEvent, ReactElement } from "react";

import {
  Calculator,
  Edit2,
  Eye,
  FileBox,
  Flame,
  Globe,
  Linkedin,
  List,
  Loader,
  Plus,
  TriangleAlert,
  X,
} from "lucide-react";

import {
  type iAliquoteComune,
  type iImuYearData,
  type iVisura,
} from "./lib/visura/visuraInterfaces";
import { parseRawDataToSituazioniVisura } from "./lib/visura/visuraExtract";
import { calculateImu } from "./lib/visura/visuraCalc";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";

import { Modal } from "./components/Modal";
import { PdfModal } from "./components/PdfModal";
import { AliquoteModal } from "./components/AliquoteModal";
import { ImuTableComponent } from "./components/ImuTable";
import { SituazioniTableComponent } from "./components/SituazioniTable";
import { ImuTableCombined } from "./components/ImuTableCombined";
import { RAW_FILE_TYPE } from "./lib/visura/fileExtract";
import type { iF24 } from "./lib/visura/f24Interfaces";
import parseDataFromF24RawData from "./lib/visura/f24Extract";
import getRawFileType from "./lib/visura/fileExtract";
import { F24Table } from "./components/F24Table";
import Census from "./components/Census";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "./components/ui/popover";
import { Button } from "./components/ui/button";
import { Download, Save, Recycle, MoreVertical } from "lucide-react";

export type DroppedFile = {
  _id: string;
  rawFileType?: RAW_FILE_TYPE;
  fileType?: "f24" | "visura";
  file?: File;
  refinedVisuraData?: iVisura;
  imuData?: iImuYearData;
  f24Data?: iF24;
  isLoading: boolean;
};

interface ActionsPopoverProps {
  restore: () => void;
  save: () => void;
  setDroppedFiles: (files: DroppedFile[]) => void;
  setAliquote: (val: any) => void;
}

export const ActionsPopover: React.FC<ActionsPopoverProps> = ({
  restore,
  save,
  setDroppedFiles,
  setAliquote,
}) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm">
          <MoreVertical />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex flex-col w-36 p-1">
        <Button
          className="justify-start"
          onClick={save}
          variant="ghost"
          size="sm"
        >
          <Save />
          Salva calcoli
        </Button>
        <Button
          className="justify-start"
          onClick={restore}
          variant="ghost"
          size="sm"
        >
          <Download />
          Ripristina
        </Button>
        <Button
          onClick={() => {
            setDroppedFiles([]);
            setAliquote(undefined);
          }}
          variant="ghost"
          size="sm"
          className="text-red-600 justify-start"
        >
          <Recycle />
          Reset
        </Button>
      </PopoverContent>
    </Popover>
  );
};

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [modalContent, setModalContent] = useState<ReactElement>();
  const [aliquote, setAliquote] = useState<iAliquoteComune>();
  const [minYear, setMinYear] = useState<number>();
  const [maxYear, setMaxYear] = useState<number>();
  const [selectedFileId, setSelectedFileId] = useState<string>();

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1990 + 1 },
    (_, i) => 1990 + i
  ).reverse();

  const save = () => {
    const data = {
      droppedFiles: droppedFiles.map((e) => {
        const dropppedFile: DroppedFile = {
          _id: e._id,
          refinedVisuraData: e.refinedVisuraData,
          imuData: e.imuData,
          f24Data: e.f24Data,
          isLoading: false,
          fileType: e.fileType,
          rawFileType: e.rawFileType,
          file: {
            name: e.file?.name,
          } as any,
        };

        return dropppedFile;
      }),
      aliquote,
      minYear,
    };

    const blob = new Blob([JSON.stringify(data)]);

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `save_${new Date().getTime()}.imuprofene`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Handle the file selection
  const handleRestoreFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (json.aliquote) setAliquote(json.aliquote);
        if (json.minYear) setMinYear(json.minYear);
        if (json.maxYear) setMaxYear(json.maxYear);
        if (json.droppedFiles) setDroppedFiles(json.droppedFiles);
      } catch (err) {
        console.error("Invalid restore file", err);
      }
    };
    reader.readAsText(file);

    // Reset input value to allow re-selecting the same file
    event.target.value = "";
  };

  const restore = () => {
    if (!fileInputRef.current) return;

    fileInputRef.current.click(); // Trigger file selection
  };

  function generateId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const newFiles: DroppedFile[] = Array.from(e.dataTransfer.files).map(
        (file) => ({
          _id: generateId(),
          file,
          isLoading: false,
        })
      );
      setDroppedFiles((prev) => [...prev, ...newFiles]);
      e.dataTransfer.clearData();
    }
  }

  function handleFileSelect(e: ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: DroppedFile[] = Array.from(e.target.files).map(
        (file) => ({
          _id: generateId(),
          file,
          isLoading: false,
        })
      );
      setDroppedFiles((prev) => [...prev, ...newFiles]);
    }
  }

  function openFileSelector() {
    fileInputRef.current?.click();
  }

  const runExtract = async () => {
    // Step 1: set all files to loading
    setDroppedFiles((prev) =>
      prev.map((file) => ({
        ...file,
        isLoading: !file.refinedVisuraData,
      }))
    );

    // Step 2: process files one by one
    for (const file of droppedFiles) {
      if (file.fileType === "visura" && file.refinedVisuraData) continue;

      if (file.fileType === "f24" && file.f24Data) continue;

      // const rawData = await pdfToRawTextData(file.file)
      const arraybuffer = await file.file?.arrayBuffer();
      if (!arraybuffer) return;
      const rawData = await window.api.parsePdf(arraybuffer); // 👈 IPC CALL

      const rawFileType = getRawFileType(rawData);

      let fileType: "visura" | "f24";

      let refinedVisuraData: iVisura;
      if (
        rawFileType === RAW_FILE_TYPE.visura_v1 ||
        rawFileType === RAW_FILE_TYPE.visura_v2 ||
        rawFileType === RAW_FILE_TYPE.visura_v3 ||
        rawFileType === RAW_FILE_TYPE.visura_v4
      ) {
        refinedVisuraData = parseRawDataToSituazioniVisura(
          rawData,
          rawFileType
        );
        fileType = "visura";
      }

      let f24Data: iF24;
      if (
        rawFileType === RAW_FILE_TYPE.f24_v1 ||
        rawFileType === RAW_FILE_TYPE.f24_v2
      ) {
        f24Data = parseDataFromF24RawData(rawData, rawFileType);
        fileType = "f24";
      }

      // Step 3: update only that file in state
      setDroppedFiles((prev) =>
        prev.map((f) =>
          f._id === file._id
            ? {
                ...f,
                rawData,
                isLoading: false,
                refinedVisuraData,
                f24Data,
                rawFileType,
                fileType,
              }
            : f
        )
      );
    }

    // Step 3: set all files to !loading
    setDroppedFiles((prev) =>
      prev.map((file) => ({
        ...file,
        isLoading: false,
      }))
    );
  };

  useEffect(() => {
    runExtract();
  }, [droppedFiles.length]);

  const runCalc = (aliquote: iAliquoteComune, droppedFiles: DroppedFile[]) => {
    if (!selectedFileId) setSelectedFileId("all");

    // Step 2: process files one by one
    for (const file of droppedFiles.filter((f) => f.fileType === "visura")) {
      if (!file.refinedVisuraData) continue;

      const imuData = calculateImu(file.refinedVisuraData, aliquote);

      // Step 3: update only that file in state
      setDroppedFiles((prev) =>
        prev.map((f) => (f._id === file._id ? { ...f, imuData } : f))
      );
    }
  };

  useEffect(() => {
    if (aliquote) runCalc(aliquote, droppedFiles);
  }, [aliquote]);

  const removeFile = (id: string) => {
    setDroppedFiles((prev) => prev.filter((file) => file._id !== id));
  };

  const presetAliquote = (): iAliquoteComune => {
    const aliquote: iAliquoteComune = {};

    const codiciComune = droppedFiles
      .map((fileObj) => fileObj.refinedVisuraData?.codiceComune)
      .filter((e) => e);

    const codiciComuneUnique = [...new Set(codiciComune)];

    codiciComuneUnique.forEach((codiceComune) => {
      if (!codiceComune) return;

      const situazioni = droppedFiles
        .filter((f) => f.refinedVisuraData?.codiceComune === codiceComune)
        .flatMap((f) => f.refinedVisuraData?.situazioni ?? []);

      const years = situazioni
        .map((s) => (s.dal ? new Date(s.dal).getFullYear() : ""))
        .filter((e): e is number => typeof e === "number");

      const minY = Math.min(...years);
      const maxY = new Date().getFullYear();
      const allYears = Array.from(
        { length: maxY - minY + 1 },
        (_, i) => minY + i
      );

      const categorie = situazioni.map((s) => s.categoria).filter((e) => e);
      const categorieUnique = [...new Set(categorie)];

      const comune = droppedFiles.find(
        (e) => e.refinedVisuraData?.codiceComune === codiceComune
      )?.refinedVisuraData?.comune;

      aliquote[codiceComune] = {
        comune: String(comune),
        years: {},
      };

      allYears.forEach((year) => {
        if (!year) return;

        aliquote[codiceComune].years[year] = {};

        categorieUnique.forEach((category) => {
          if (!category) return;

          aliquote[codiceComune].years[year][category] = undefined;
        });
      });
    });

    setAliquote(aliquote);
    return aliquote;
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-screen max-h-screen w-screen relative flex flex-col overflow-hidden"
    >
      {isDragging && (
        <>
          <div className="absolute rounded inset-0 m-5 flex items-center justify-center border-blue-500 bg-blue-100 border-5 border-dashed pointer-events-none z-50">
            <div className="flex items-center justify-center">
              <p className="font-semibold text-5xl flex items-center gap-5 text-center">
                Drop like it's hot <Flame size={50} fill="red" />
              </p>
            </div>
          </div>
        </>
      )}

      <nav className="flex gap-3 border-b px-5 py-2 items-center">
        <h1 className="font-semibold mr-5">IMUPROFENE</h1>

        <Select
          onValueChange={(val) => setMinYear(Number(val))}
          value={minYear?.toString()}
        >
          <SelectTrigger className="cursor-pointer">
            <SelectValue placeholder={"Dal ..."} />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => {
              if (maxYear && year > maxYear) return null;

              return (
                <SelectItem
                  className="cursor-pointer hover:bg-gray-100 p-1 text-sm"
                  key={year}
                  value={year.toString()}
                >
                  <span className="font-light">Dal</span>{" "}
                  <span className="font-semibold">{year}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
        <Select
          onValueChange={(val) => setMaxYear(Number(val))}
          value={maxYear?.toString()}
        >
          <SelectTrigger className="cursor-pointer">
            <SelectValue placeholder={"Al ..."} />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => {
              if (minYear && year < minYear) return null;

              return (
                <SelectItem
                  className="cursor-pointer hover:bg-gray-100 p-1 text-sm"
                  key={year}
                  value={year.toString()}
                >
                  <span className="font-light">Al</span>{" "}
                  <span className="font-semibold">{year}</span>
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        <Button
          onClick={() => {
            const a = aliquote ?? presetAliquote();

            setModalContent(
              <AliquoteModal
                minYear={minYear}
                maxYear={maxYear}
                _setAliquote={(e) => {
                  setAliquote(e);
                  setModalContent(undefined);
                }}
                _aliquote={a}
              />
            );
          }}
          disabled={!droppedFiles.filter((f) => f.refinedVisuraData).length}
          size={"sm"}
        >
          Imposta aliquote
          <Edit2 />
        </Button>

        <div className="flex ml-auto">
          <ActionsPopover
            restore={restore}
            save={save}
            setDroppedFiles={setDroppedFiles}
            setAliquote={setAliquote}
          />
        </div>
      </nav>

      <div className="h-1 min-h-1 bg-gray-200 rounded overflow-hidden">
        {droppedFiles.filter((e) => e.isLoading).length > 0 && (
          <div
            className="h-full bg-blue-500 transition-all duration-75"
            style={{
              width: `${
                (1 -
                  droppedFiles.filter((e) => e.isLoading).length /
                    droppedFiles.length) *
                100
              }%`,
            }}
          />
        )}
      </div>

      <div className="flex h-full overflow-hidden">
        <div className="w-sm min-w-sm h-full p-2 border-r flex flex-col">
          <div className="flex flex-col justify-center mb-2 gap-1">
            {!!droppedFiles.find((e) => !!e.refinedVisuraData) && (
              <Button size={"sm"} onClick={() => setSelectedFileId("census")}>
                Vedi il perimetro <List />
              </Button>
            )}
            {!!droppedFiles.find((e) => !!e.imuData) && (
              <Button size={"sm"} onClick={() => setSelectedFileId("all")}>
                Vedi i calcoli agglomerati <Calculator />
              </Button>
            )}

            <br />
            <hr />
            <br />

            <Button
              size={"sm"}
              variant={"outline"}
              className="rounded-full"
              onClick={openFileSelector}
            >
              Aggiungi file <Plus />
            </Button>
          </div>

          <div className="flex flex-col h-full overflow-scroll">
            {droppedFiles.length > 0 && (
              <>
                <div className="flex flex-col w-full">
                  {!!droppedFiles.filter((f) => f.fileType === "visura")
                    .length && (
                    <span className="font-semibold text-sm">Visure</span>
                  )}
                  {droppedFiles
                    .filter((f) => f.fileType === "visura")
                    .map((fileObj, key) => (
                      <div
                        className={`relative border-b flex flex-col cursor-pointer w-full ${
                          fileObj._id === selectedFileId
                            ? "bg-gray-200"
                            : "hover:bg-gray-100"
                        }`}
                        key={key}
                        onClick={() => setSelectedFileId(fileObj._id)}
                      >
                        <div className="flex flex-row gap-3 items-center w-full">
                          <div className="flex items-center w-full">
                            <Button
                              size={"sm"}
                              onClick={() => removeFile(fileObj._id)}
                              variant={"ghost"}
                              className="text-red-600"
                            >
                              <X />
                            </Button>

                            <span className="text-nowrap truncate text-sm">
                              {fileObj.file?.name}
                            </span>

                            {!droppedFiles.filter((e) => e.isLoading)
                              .length && (
                              <>
                                {droppedFiles.filter((f) => f.refinedVisuraData)
                                  .length &&
                                  !fileObj.refinedVisuraData?.situazioni
                                    .length && (
                                    <>
                                      <TriangleAlert
                                        size={17}
                                        className="ml-2 min-w-5"
                                        fill="yellow"
                                      />
                                    </>
                                  )}
                              </>
                            )}

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

                            <div className="ml-auto flex">
                              {fileObj.isLoading && (
                                <>
                                  <Loader size={20} className="animate-spin" />
                                </>
                              )}
                              {!fileObj.isLoading && (
                                <>
                                  <FileBox
                                    className={`${
                                      fileObj.refinedVisuraData?.situazioni
                                        .length
                                        ? ""
                                        : "text-gray-300"
                                    }`}
                                    size={20}
                                  />
                                  <Calculator
                                    className={`${
                                      Object.values(fileObj.imuData ?? {}).some(
                                        (entry) => typeof entry.imu === "number"
                                      )
                                        ? ""
                                        : "text-gray-300"
                                    }`}
                                    size={20}
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="flex flex-col w-full">
                  {!!droppedFiles.filter((f) => f.fileType === "f24")
                    .length && (
                    <span className="font-semibold text-sm mt-4">F24</span>
                  )}

                  {droppedFiles
                    .filter((f) => f.fileType === "f24")
                    .map((fileObj, key) => (
                      <div
                        className={`relative border-b flex flex-col cursor-pointer w-full ${
                          fileObj._id === selectedFileId
                            ? "bg-gray-200"
                            : "hover:bg-gray-100"
                        }`}
                        key={key}
                        onClick={() => setSelectedFileId(fileObj._id)}
                      >
                        <div className="flex flex-row gap-3 items-center w-full">
                          <div className="flex items-center w-full">
                            <Button
                              size={"sm"}
                              onClick={() => removeFile(fileObj._id)}
                              variant={"ghost"}
                              className="text-red-600"
                            >
                              <X />
                            </Button>

                            <span className="text-nowrap truncate text-sm">
                              {fileObj.file?.name}
                            </span>

                            {!droppedFiles.filter((e) => e.isLoading)
                              .length && (
                              <>
                                {!droppedFiles.filter((f) => f.f24Data)
                                  .length && (
                                  <>
                                    <TriangleAlert
                                      size={17}
                                      className="ml-2 min-w-5"
                                      fill="yellow"
                                    />
                                  </>
                                )}
                              </>
                            )}

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

                            <div className="ml-auto flex">
                              {fileObj.isLoading && (
                                <>
                                  <Loader size={20} className="animate-spin" />
                                </>
                              )}
                              {!fileObj.isLoading && (
                                <>
                                  <FileBox
                                    className={`${fileObj.f24Data ? "" : "text-gray-300"}`}
                                    size={20}
                                  />
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-col p-4 w-full overflow-scroll">
          {selectedFileId === "all" && (
            <ImuTableCombined
              onSelect={(fileId) => setSelectedFileId(fileId)}
              droppedFiles={droppedFiles}
              minYear={minYear}
              maxYear={maxYear}
              setModalContent={setModalContent}
            />
          )}

          {selectedFileId === "census" && (
            <Census
              droppedFiles={droppedFiles}
              setModalContent={setModalContent}
            />
          )}

          {!!droppedFiles.length && selectedFileId ? (
            <>
              {!!droppedFiles.find((f) => f._id === selectedFileId) &&
                droppedFiles.find((f) => f._id === selectedFileId)?.fileType ===
                  "visura" && (
                  <>
                    {droppedFiles.find((f) => f._id === selectedFileId)!
                      .refinedVisuraData && (
                      <>
                        <div className="flex justify-between mb-2 items-center">
                          <p className="font-semibold flex items-center">
                            Numero visura:{" "}
                            {
                              droppedFiles.find(
                                (f) => f._id === selectedFileId
                              )!.refinedVisuraData!.numero
                            }{" "}
                            / Comune:{" "}
                            {
                              droppedFiles.find(
                                (f) => f._id === selectedFileId
                              )!.refinedVisuraData!.comune
                            }{" "}
                            (
                            {
                              droppedFiles.find(
                                (f) => f._id === selectedFileId
                              )!.refinedVisuraData!.codiceComune
                            }
                            )
                            {!!droppedFiles.find(
                              (f) => f._id === selectedFileId
                            )!.file?.arrayBuffer && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={
                                  !droppedFiles.find(
                                    (f) => f._id === selectedFileId
                                  )!.file?.arrayBuffer
                                }
                                onClick={() =>
                                  setModalContent(
                                    <PdfModal
                                      pdf={
                                        droppedFiles.find(
                                          (f) => f._id === selectedFileId
                                        )!.file!
                                      }
                                    />
                                  )
                                }
                              >
                                <Eye />
                              </Button>
                            )}
                          </p>
                        </div>

                        <SituazioniTableComponent
                          onChangeVal={(index, val) => {
                            const droppedFilesCopy =
                              structuredClone(droppedFiles);

                            droppedFilesCopy.find(
                              (f) =>
                                f._id ===
                                droppedFiles.find(
                                  (f) => f._id === selectedFileId
                                )!._id
                            )!.refinedVisuraData!.situazioni[index].rendita =
                              val;

                            setDroppedFiles(droppedFilesCopy);
                            if (aliquote) runCalc(aliquote, droppedFilesCopy);
                          }}
                          data={
                            droppedFiles.find((f) => f._id === selectedFileId)!
                              .refinedVisuraData!
                          }
                        />

                        {droppedFiles.find((f) => f._id === selectedFileId)!
                          .imuData && (
                          <>
                            <p className="font-semibold mt-4 mb-2">
                              Calcolo IMU
                            </p>
                            <ImuTableComponent
                              minYear={minYear}
                              maxYear={maxYear}
                              imuData={
                                droppedFiles.find(
                                  (f) => f._id === selectedFileId
                                )!.imuData!
                              }
                            />
                          </>
                        )}
                      </>
                    )}
                  </>
                )}
              {!!droppedFiles.find((f) => f._id === selectedFileId) &&
                droppedFiles.find((f) => f._id === selectedFileId)?.fileType ===
                  "f24" && (
                  <>
                    <p className="font-semibold flex items-center">
                      {
                        droppedFiles.find((f) => f._id === selectedFileId)!.file
                          ?.name
                      }{" "}
                      (Data versamento:{" "}
                      {new Date(
                        String(
                          droppedFiles.find((f) => f._id === selectedFileId)
                            ?.f24Data?.dataVersamento
                        )
                      ).toLocaleDateString("it-IT")}
                      )
                      {!!droppedFiles.find((f) => f._id === selectedFileId)!
                        .file?.arrayBuffer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={
                            !droppedFiles.find((f) => f._id === selectedFileId)!
                              .file?.arrayBuffer
                          }
                          onClick={() =>
                            setModalContent(
                              <PdfModal
                                pdf={
                                  droppedFiles.find(
                                    (f) => f._id === selectedFileId
                                  )!.file!
                                }
                              />
                            )
                          }
                        >
                          <Eye />
                        </Button>
                      )}
                    </p>

                    <F24Table
                      f24={
                        droppedFiles.find((f) => f._id === selectedFileId)
                          ?.f24Data!
                      }
                    />
                  </>
                )}
            </>
          ) : null}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />

      <input
        ref={fileInputRef}
        type="file"
        accept=".imuprofene,application/json"
        style={{ display: "none" }}
        onChange={handleRestoreFile}
      />

      <Modal
        onClose={() => setModalContent(undefined)}
        content={modalContent}
      />

      <footer className="text-sm font-semibold p-3  border-t flex items-center justify-center gap-2">
        <p>Made with 💙 by Vincenzo Bonaccorso</p>{" "}
        <div className="h-5 border-r border-slate-300"></div>
        <a
          target="_blank"
          href="https://www.linkedin.com/in/vincenzo-bonaccorso/"
        >
          <Linkedin size={17} />
        </a>
        <a target="_blank" href="https://vincenzobonaccorso.it/">
          <Globe size={17} />
        </a>
      </footer>
    </div>
  );
}

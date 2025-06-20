import { useState, useRef, useEffect } from "react";
import type { DragEvent, ChangeEvent, ReactElement } from "react";

import {
  Calculator,
  Download,
  Edit2,
  Eye,
  FileBox,
  Flame,
  Globe,
  Linkedin,
  Loader,
  Plus,
  Recycle,
  Save,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { pdfToRawTextData } from "./lib/pdf";
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
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { SelectItem } from "@radix-ui/react-select";
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

export type DroppedFile = {
  _id: string;
  rawFileType?: RAW_FILE_TYPE;
  fileType?: "f24" | "visura";
  file: File;
  refinedVisuraData?: iVisura;
  imuData?: iImuYearData;
  f24Data?: iF24;
  isLoading: boolean;
};

export default function App() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [modalContent, setModalContent] = useState<ReactElement>();
  const [aliquote, setAliquote] = useState<iAliquoteComune>();
  const [minYear, setMinYear] = useState<number>();
  const [selectedFileId, setSelectedFileId] = useState<string>();

  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1970 + 1 },
    (_, i) => 1970 + i
  ).reverse();

  const save = () => {
    const data = {
      droppedFiles: droppedFiles.map((e) => {
        const dropppedFile: DroppedFile = {
          _id: e._id,
          refinedVisuraData: e.refinedVisuraData,
          imuData: e.imuData,
          isLoading: false,
          fileType: e.fileType,
          rawFileType: e.rawFileType,
          file: {
            name: e.file.name,
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

      const rawData = await pdfToRawTextData(file.file);

      const rawFileType = getRawFileType(rawData);

      let fileType: "visura" | "f24";

      let refinedVisuraData: iVisura;
      if (
        rawFileType === RAW_FILE_TYPE.visura_v1 ||
        rawFileType === RAW_FILE_TYPE.visura_v2
      ) {
        refinedVisuraData = parseRawDataToSituazioniVisura(
          rawData,
          rawFileType
        );
        fileType = "visura";
      }

      let f24Data: iF24;
      if (
        rawFileType === RAW_FILE_TYPE.f24 ||
        rawFileType === RAW_FILE_TYPE.quietanzaf24
      ) {
        f24Data = parseDataFromF24RawData(rawData);
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
    // Step 2: process files one by one
    for (const file of droppedFiles) {
      if (!file.refinedVisuraData) return;

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

    const comuni = droppedFiles
      .map((fileObj) => fileObj.refinedVisuraData?.comune)
      .filter((e) => e);

    const comuniUnique = [...new Set(comuni)];

    comuniUnique.forEach((comune) => {
      if (!comune) return;

      const situazioni = droppedFiles
        .filter((f) => f.refinedVisuraData?.comune === comune)
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

      aliquote[comune] = {};

      allYears.forEach((year) => {
        if (!year) return;

        aliquote[comune][year] = {};

        categorieUnique.forEach((category) => {
          if (!category) return;

          aliquote[comune][year][category] = undefined;
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
              <p className="font-semibold text-5xl flex items-center gap-5">
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
            {minYear && (
              <>
                <span className="font-light">Dal</span>{" "}
                <span className="font-semibold">{minYear}</span>
              </>
            )}
            <SelectValue placeholder={"Filtra per anno"} />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem
                className="cursor-pointer hover:bg-gray-100 p-1 text-sm"
                key={year}
                value={year.toString()}
              >
                <span className="font-light">Dal</span>{" "}
                <span className="font-semibold">{year}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button
          onClick={() => {
            const a = aliquote ?? presetAliquote();

            setModalContent(
              <AliquoteModal
                minYear={minYear}
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
          <Button
            onClick={() => {
              restore();
            }}
            size={"lg"}
            className=""
            variant={"ghost"}
          >
            <Download />
          </Button>
          <Button
            onClick={() => {
              save();
            }}
            size={"lg"}
            className=""
            variant={"ghost"}
          >
            <Save />
          </Button>
          <Button
            onClick={() => {
              setDroppedFiles([]);
              setAliquote(undefined);
            }}
            size={"lg"}
            className=" text-red-600"
            variant={"ghost"}
          >
            <Recycle />
          </Button>
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
        <div className="w-xs min-w-xs h-full p-2 border-r overflow-scroll">
          <div className="flex justify-center mb-2">
            <Button
              size={"sm"}
              variant={"outline"}
              className="rounded-full"
              onClick={openFileSelector}
            >
              Aggiungi file <Plus />
            </Button>
          </div>

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
                            {fileObj.file.name}
                          </span>

                          {!droppedFiles.filter((e) => e.isLoading).length && (
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
                                    fileObj.refinedVisuraData?.situazioni.length
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

                {!!droppedFiles.find((e) => !!e.imuData) && (
                  <Button
                    className="mt-5"
                    size={"sm"}
                    variant={"secondary"}
                    onClick={() => setSelectedFileId("all")}
                  >
                    Vedi tutti
                  </Button>
                )}
              </div>

              <div className="flex flex-col w-full">
                {!!droppedFiles.filter((f) => f.fileType === "f24").length && (
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
                            {fileObj.file.name}
                          </span>

                          {!droppedFiles.filter((e) => e.isLoading).length && (
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
                                    fileObj.f24Data ? "" : "text-gray-300"
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

                {!!droppedFiles.find((e) => !!e.imuData) && (
                  <Button
                    className="mt-5"
                    size={"sm"}
                    variant={"secondary"}
                    onClick={() => setSelectedFileId("all")}
                  >
                    Vedi tutti
                  </Button>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex flex-col p-4 w-full overflow-scroll">
          {selectedFileId === "all" && (
            <ImuTableCombined
              onSelect={(fileId) => setSelectedFileId(fileId)}
              droppedFiles={droppedFiles}
              minYear={minYear}
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
                          <p className="font-semibold">
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
                  "f24" && <>TODO: F24 Page</>}
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

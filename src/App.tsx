import { useState, useRef } from "react";
import type { DragEvent, ChangeEvent, ReactElement } from "react";

import {
  Calculator,
  Edit2,
  Eye,
  FileBox,
  Flame,
  Loader,
  Plus,
  Recycle,
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

type DroppedFile = {
  _id: string;
  file: File;
  refinedData?: iVisura;
  imuData?: iImuYearData;
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
        isLoading: true,
      }))
    );

    // Step 2: process files one by one
    for (const file of droppedFiles) {
      const rawData = await pdfToRawTextData(file.file);
      const refinedData = parseRawDataToSituazioniVisura(rawData);

      // Step 3: update only that file in state
      setDroppedFiles((prev) =>
        prev.map((f) =>
          f._id === file._id
            ? { ...f, rawData, isLoading: false, refinedData }
            : f
        )
      );
    }
  };

  const runCalc = () => {
    if (!aliquote) return;

    // Step 2: process files one by one
    for (const file of droppedFiles) {
      if (!file.refinedData) return;

      const imuData = calculateImu(file.refinedData, aliquote);

      // Step 3: update only that file in state
      setDroppedFiles((prev) =>
        prev.map((f) => (f._id === file._id ? { ...f, imuData } : f))
      );
    }
  };

  const removeFile = (id: string) => {
    setDroppedFiles((prev) => prev.filter((file) => file._id !== id));
  };

  const presetAliquote = (): iAliquoteComune => {
    const aliquote: iAliquoteComune = {};

    const comuni = droppedFiles
      .map((fileObj) => fileObj.refinedData?.comune)
      .filter((e) => e);

    const comuniUnique = [...new Set(comuni)];

    comuniUnique.forEach((comune) => {
      if (!comune) return;

      const situazioni = droppedFiles
        .filter((f) => f.refinedData?.comune === comune)
        .flatMap((f) => f.refinedData?.situazioni ?? []);

      const years = situazioni
        .map((s) => s.dal?.getFullYear())
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
      className="h-screen w-screen relative flex flex-col"
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

        <Button
          disabled={!droppedFiles.length}
          onClick={runExtract}
          size={"sm"}
        >
          Estrai dati PDF
          <FileBox />
        </Button>

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
          disabled={!droppedFiles.filter((f) => f.refinedData).length}
          size={"sm"}
        >
          Imposta aliquote
          <Edit2 />
        </Button>

        <Button
          disabled={!droppedFiles.length || !aliquote}
          onClick={runCalc}
          size={"sm"}
        >
          Calcola IMU
          <Calculator />
        </Button>

        <Select
          onValueChange={(val) => setMinYear(Number(val))}
          value={minYear?.toString()}
        >
          <SelectTrigger className="cursor-pointer">
            {minYear}
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
            setDroppedFiles([]);
            setAliquote(undefined);
          }}
          size={"lg"}
          className="ml-auto text-red-600"
          variant={"ghost"}
        >
          <Recycle />
        </Button>
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
              }‰`,
            }}
          />
        )}
      </div>

      <div className="flex h-full">
        <div className="w-sm min-w-sm h-full p-2 border-r">
          <div className="flex justify-center mb-2">
            <Button
              size={"sm"}
              variant={"outline"}
              className="rounded-full"
              onClick={openFileSelector}
            >
              Aggiungi visura <Plus />
            </Button>
          </div>
          {droppedFiles.length > 0 && (
            <div className="flex flex-col w-full">
              {droppedFiles.map((fileObj) => (
                <div
                  className={`relative border-b flex flex-col cursor-pointer w-full ${
                    fileObj._id === selectedFileId
                      ? "bg-gray-200"
                      : "hover:bg-gray-100"
                  }`}
                  key={fileObj._id}
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

                      <Button
                        variant="ghost"
                        size="sm"
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
                                fileObj.refinedData ? "" : "text-gray-300"
                              }`}
                              size={20}
                            />
                            <Calculator
                              className={`${
                                fileObj.imuData ? "" : "text-gray-300"
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
          )}
        </div>

        <div className="flex flex-col p-4 w-full">
          {!!droppedFiles.length &&
            selectedFileId &&
            !!droppedFiles.find((f) => f._id === selectedFileId) && (
              <>
                {droppedFiles.find((f) => f._id === selectedFileId)!
                  .refinedData && (
                  <>
                    <div className="flex justify-between mb-2 items-center">
                      <p className="font-semibold">
                        Numero visura:{" "}
                        {
                          droppedFiles.find((f) => f._id === selectedFileId)!
                            .refinedData!.numero
                        }{" "}
                        / Comune:{" "}
                        {
                          droppedFiles.find((f) => f._id === selectedFileId)!
                            .refinedData!.comune
                        }{" "}
                        (
                        {
                          droppedFiles.find((f) => f._id === selectedFileId)!
                            .refinedData!.codiceComune
                        }
                        )
                      </p>
                    </div>

                    <SituazioniTableComponent
                      onChangeVal={(index, val) => {
                        const droppedFilesCopy = structuredClone(droppedFiles);

                        droppedFilesCopy.find(
                          (f) =>
                            f._id ===
                            droppedFiles.find((f) => f._id === selectedFileId)!
                              ._id
                        )!.refinedData!.situazioni[index].rendita = val;

                        setDroppedFiles(droppedFilesCopy);
                      }}
                      data={
                        droppedFiles.find((f) => f._id === selectedFileId)!
                          .refinedData!
                      }
                    />

                    {droppedFiles.find((f) => f._id === selectedFileId)!
                      .imuData && (
                      <>
                        <p className="font-semibold mt-4 mb-2">Calcolo IMU</p>
                        <ImuTableComponent
                          minYear={minYear}
                          imuData={
                            droppedFiles.find((f) => f._id === selectedFileId)!
                              .imuData!
                          }
                        />
                      </>
                    )}
                  </>
                )}
              </>
            )}
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

      <Modal
        onClose={() => setModalContent(undefined)}
        content={modalContent}
      />
    </div>
  );
}

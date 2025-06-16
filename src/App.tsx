import { useState, useRef } from "react";
import type { DragEvent, ChangeEvent } from "react";

import {
  Calculator,
  ChevronRight,
  Edit,
  Eye,
  Flame,
  Loader,
  Plus,
  Recycle,
  Upload,
  X,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { pdfToRawTextData } from "./lib/pdf";
import type { iImuYearData, iVisura } from "./lib/visura/visuraInterfaces";
import { parseRawDataToSituazioniVisura } from "./lib/visura/visuraExtract";
import { calculateImu } from "./lib/visura/visuraCalc";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/ui/accordion";

export function ImuTableComponent({ imuData }: { imuData: iImuYearData }) {
  const sortedYears = Object.keys(imuData)
    .map(Number)
    .sort((a, b) => b - a); // sort from newest to oldest

  return (
    <div className="">
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">Anno</th>
            <th className="border px-4 py-2">Rendita</th>
            <th className="border px-4 py-2">Aliquote</th>
            <th className="border px-4 py-2">IMU</th>
          </tr>
        </thead>
        <tbody>
          {sortedYears.map((year) => (
            <tr key={year}>
              <td className="border px-4 py-2">{year}</td>
              <td className="border px-4 py-2">
                {imuData[year].rendita < 0 ? (
                  <X className="text-red-500 w-4 h-4" />
                ) : (
                  `€ ${imuData[year].rendita.toFixed(2)}`
                )}
              </td>
              <td className="border px-4 py-2">
                {imuData[year].aliquote.some((a) => a < 0) ? (
                  <X className="text-red-500 w-4 h-4" />
                ) : (
                  imuData[year].aliquote.join(", ")
                )}
              </td>
              <td className="border px-4 py-2">
                {imuData[year].imu < 0 ? (
                  <X className="text-red-500 w-4 h-4" />
                ) : (
                  `€ ${imuData[year].imu.toFixed(2)}`
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function SituazioniTableComponent({ data }: { data: iVisura }) {
  return (
    <div className="">
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">Dal</th>
            <th className="border px-4 py-2">Unità (foglio-particella-sub)</th>
            <th className="border px-4 py-2">Categoria</th>
            <th className="border px-4 py-2">Rendita</th>
            <th className="border px-4 py-2">Tipo</th>
          </tr>
        </thead>
        <tbody>
          {data.situazioni.map((situazione, index) => (
            <tr key={index}>
              <td className="border px-4 py-2">
                {situazione.dal &&
                  new Date(situazione.dal).toLocaleDateString()}
              </td>
              <td className="border px-4 py-2">
                {situazione.unità && (
                  <div className="flex flex-col">
                    {situazione.unità.map((u, key) => {
                      return (
                        <span key={key}>
                          {u.foglio ?? ""}-{u.particella ?? ""}-{u.sub ?? ""}
                        </span>
                      );
                    })}
                  </div>
                )}
              </td>
              <td className="border px-4 py-2">{situazione.categoria}</td>
              <td className="border px-4 py-2">
                € {situazione.rendita?.toFixed(2)}
              </td>
              <td className="border px-4 py-2">{situazione.type}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type DroppedFile = {
  _id: string;
  file: File;
  refinedData?: iVisura;
  imuData?: iImuYearData;
  isLoading: boolean;
};

export default function App() {
  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pdfModalFile, setPdfModalFile] = useState<File | null>(null);

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
    // Step 2: process files one by one
    for (const file of droppedFiles) {
      if (!file.refinedData) return;

      const imuData = calculateImu(file.refinedData);

      // Step 3: update only that file in state
      setDroppedFiles((prev) =>
        prev.map((f) => (f._id === file._id ? { ...f, imuData } : f))
      );
    }
  };

  const removeFile = (id: string) => {
    setDroppedFiles((prev) => prev.filter((file) => file._id !== id));
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-screen w-screen relative space-y-4 flex flex-col"
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

      <div className="flex gap-3 m-5">
        <Button
          size={"sm"}
          variant={"outline"}
          className="rounded-full"
          onClick={openFileSelector}
        >
          <Plus />
        </Button>

        <Button
          disabled={!droppedFiles.length}
          onClick={runExtract}
          size={"sm"}
        >
          <Upload />
          <ChevronRight />
        </Button>

        <Button disabled={!droppedFiles.length} size={"sm"}>
          <Edit />
          <ChevronRight />
        </Button>

        <Button disabled={!droppedFiles.length} onClick={runCalc} size={"sm"}>
          <Calculator />
          <ChevronRight />
        </Button>

        <Button
          onClick={() => setDroppedFiles([])}
          size={"lg"}
          className="ml-auto text-red-600"
          variant={"ghost"}
        >
          <Recycle />
        </Button>
      </div>

      {droppedFiles.filter((e) => e.isLoading).length > 0 && (
        <div className="h-3 min-h-3 bg-gray-200 mx-3 rounded overflow-hidden">
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
        </div>
      )}

      {droppedFiles.length > 0 && (
        <div className="flex flex-col gap-3 px-3">
          {droppedFiles.map((fileObj) => (
            <div
              className="relative border-2 border-slate-600 rounded bg-gray-200 flex flex-col"
              key={fileObj._id}
            >
              <Accordion type="multiple" className="w-full">
                <AccordionItem value="exported-data">
                  <div className="flex flex-row gap-3 items-center">
                    {fileObj.isLoading && (
                      <Loader className="animate-spin absolute top-1/2 right-1/2" />
                    )}

                    <div className="flex items-center w-full px-3">
                      <AccordionTrigger className="cursor-pointer">
                        <span>{fileObj.file.name}</span>
                      </AccordionTrigger>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setPdfModalFile(fileObj.file)}
                      >
                        <Eye />
                      </Button>
                      <Button
                        onClick={() => removeFile(fileObj._id)}
                        variant={"ghost"}
                        className="text-red-600 ml-auto"
                      >
                        <X />
                      </Button>
                    </div>
                  </div>

                  {fileObj.refinedData && (
                    <AccordionContent className="border-t border-slate-600 rounded p-3 bg-white">
                      <div className="flex justify-between mb-2 items-center">
                        <p className="font-semibold">
                          Numero visura: {fileObj.refinedData.numero} / Comune:{" "}
                          {fileObj.refinedData.comune} (
                          {fileObj.refinedData.codiceComune})
                        </p>
                      </div>

                      <SituazioniTableComponent data={fileObj.refinedData} />

                      {fileObj.imuData && (
                        <>
                          <p className="font-semibold mt-4 mb-2">Calcolo IMU</p>
                          <ImuTableComponent imuData={fileObj.imuData} />
                        </>
                      )}
                    </AccordionContent>
                  )}
                </AccordionItem>
              </Accordion>
            </div>
          ))}
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileSelect}
        className="hidden"
      />

      {pdfModalFile && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center  h-screen w-screen p-5">
          <div className="bg-white rounded-lg shadow-lg relative flex flex-col h-full w-full">
            <Button
              className="ml-auto"
              onClick={() => setPdfModalFile(null)}
              variant={"ghost"}
              size={"lg"}
            >
              <X />
            </Button>
            <iframe
              src={URL.createObjectURL(pdfModalFile)}
              title="Anteprima PDF"
              className="w-full h-full rounded-b-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
}

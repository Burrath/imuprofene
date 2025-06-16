import { useState, useRef, useEffect } from "react";
import type { DragEvent, ChangeEvent } from "react";

import {
  Calculator,
  ChevronRight,
  Import,
  Loader,
  Plus,
  X,
} from "lucide-react";
import { Button } from "./components/ui/button";
import { pdfToRawTextData } from "./lib/pdf";
import type { iImuYearData, iVisura } from "./lib/visura/visuraInterfaces";
import { parseRawDataToSituazioniVisura } from "./lib/visura/visuraExtract";
import { calculateImu } from "./lib/visura/visuraCalc";
import type { iAliquoteComune } from "./lib/visura/aliquota";

export function ImuTableComponent({ imuData }: { imuData: iImuYearData }) {
  const sortedYears = Object.keys(imuData)
    .map(Number)
    .sort((a, b) => b - a); // sort from newest to oldest

  return (
    <div className="mt-4">
      <h3 className="text-lg font-semibold mb-2">Dati IMU</h3>
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
                € {imuData[year].rendita.toFixed(2)}
              </td>
              <td className="border px-4 py-2">
                {imuData[year].aliquote.join(",")}
              </td>
              <td className="border px-4 py-2">
                € {imuData[year].imu.toFixed(2)}
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
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">
        Numero visura: {data.numero} / Comune: {data.comune} (
        {data.codiceComune})
      </h2>
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">Dal</th>
            <th className="border px-4 py-2">Unità (foglio/particella/sub)</th>
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
                {situazione.unità &&
                  situazione.unità
                    .map(
                      (u) =>
                        `Foglio ${u.foglio ?? ""}, Particella ${
                          u.particella ?? ""
                        }, Sub ${u.sub ?? ""}`
                    )
                    .join(" | ")}
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

  const [aliquoteComuni, setAliquoteComuni] = useState<iAliquoteComune>();

  useEffect(() => {
    (async () => {
      const res = await fetch("/aliquote-comuni.json");
      const data: iAliquoteComune = await res.json();

      setAliquoteComuni(data);
    })();
  }, []);

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

  const runCalc = async () => {
    // Step 1: set all files to loading
    setDroppedFiles((prev) =>
      prev.map((file) => ({
        ...file,
        isLoading: true,
      }))
    );

    // Step 2: process files one by one
    for (const file of droppedFiles) {
      if (!file.refinedData || !aliquoteComuni) continue;

      const imuData = await calculateImu(file.refinedData, aliquoteComuni);

      // Step 3: update only that file in state
      setDroppedFiles((prev) =>
        prev.map((f) =>
          f._id === file._id ? { ...f, isLoading: false, imuData } : f
        )
      );
    }
  };

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
        <div className="absolute rounded inset-0 flex items-center justify-center border-blue-500 bg-blue-100 border-5 pointer-events-none">
          <div className="flex items-center justify-center">
            <p>Drop like it's hot 🔥</p>
          </div>
        </div>
      )}

      <div className="flex gap-3 m-5">
        <Button
          size={"lg"}
          variant={"outline"}
          className="rounded-full"
          onClick={openFileSelector}
        >
          <Plus />
        </Button>

        <Button onClick={runExtract} size={"lg"}>
          <Import />
          <ChevronRight />
        </Button>

        <Button onClick={runCalc} size={"lg"}>
          <Calculator />
          <ChevronRight />
        </Button>
      </div>

      {droppedFiles.filter((e) => e.isLoading).length > 0 && (
        <div className="h-3 bg-gray-200 mx-3 rounded overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-1000"
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
              className="border rounded p-3 bg-gray-50 flex flex-col gap-3"
              key={fileObj._id}
            >
              <div className="flex flex-row gap-3 items-center">
                <Button
                  onClick={() => removeFile(fileObj._id)}
                  variant={"ghost"}
                  className="text-red-600"
                >
                  <X />
                </Button>
                <div className="flex flex-col">
                  <span>{fileObj.file.name}</span>
                </div>
                <div className="ml-auto">
                  {fileObj.isLoading && <Loader className="animate-spin" />}
                </div>
              </div>

              {fileObj.refinedData && (
                <SituazioniTableComponent data={fileObj.refinedData} />
              )}

              {fileObj.imuData && (
                <ImuTableComponent imuData={fileObj.imuData} />
              )}
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
    </div>
  );
}

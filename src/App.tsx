import { useState, useRef } from "react";
import type { DragEvent, ChangeEvent, ReactElement } from "react";

import {
  Calculator,
  Check,
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
import {
  type iAliquoteComune,
  type iImuYearData,
  type iVisura,
} from "./lib/visura/visuraInterfaces";
import { parseRawDataToSituazioniVisura } from "./lib/visura/visuraExtract";
import { calculateImu } from "./lib/visura/visuraCalc";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "./components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectTrigger,
  SelectValue,
} from "./components/ui/select";
import { SelectItem } from "@radix-ui/react-select";
import { formatNumberIT } from "./lib/utils";

function Modal({
  content,
  onClose,
}: {
  content?: ReactElement;
  onClose: () => void;
}) {
  if (!content) return <></>;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center h-screen w-screen p-5">
      <div className="bg-white flex w-full">
        <Button
          onClick={() => onClose()}
          className="ml-auto"
          variant={"ghost"}
          size={"lg"}
        >
          <X />
        </Button>
      </div>
      <div className="h-full w-full bg-white overflow-scroll">{content}</div>
    </div>
  );
}

function PdfModal({ pdf }: { pdf: any }) {
  return (
    <div className="rounded-lg shadow-lg relative flex flex-col h-full w-full">
      <iframe
        src={URL.createObjectURL(pdf)}
        title="Anteprima PDF"
        className="w-full h-full rounded-b-lg"
      />
    </div>
  );
}

function AliquoteModal({
  _aliquote,
  _setAliquote,
  minYear,
}: {
  _aliquote: iAliquoteComune;
  _setAliquote: (e: iAliquoteComune) => void;
  minYear?: number;
}) {
  const [aliquote, setAliquote] = useState<iAliquoteComune>(_aliquote);

  const comuni = Object.keys(aliquote).sort();

  return (
    <div className="space-y-4 p-4">
      {comuni.map((comune, comuneIndex) => {
        const years = Object.keys(aliquote[comune]).sort(
          (a, b) => Number(b) - Number(a)
        );

        return (
          <div key={comuneIndex} className="p-4 bg-gray">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">{comune}</h2>

            {years.map((year, yearIndex) => {
              if (minYear && Number(year) < minYear) return <></>;

              const categorie = Object.keys(aliquote[comune][year]).sort();

              return (
                <div
                  key={yearIndex}
                  className="mb-4 border rounded border-slate-800 p-2"
                >
                  <h3 className="text-lg flex items-center justify-between font-semibold text-gray-700 mb-2">
                    <span>Anno: {year}</span>
                    <Button
                      onClick={() => {
                        const aliquoteCopy = structuredClone(aliquote);

                        delete aliquoteCopy[comune][year];
                        setAliquote(aliquoteCopy);
                      }}
                      className="text-red-600"
                      variant={"ghost"}
                    >
                      <X />
                    </Button>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {categorie.map((categoria, categoriaIndex) => (
                      <div
                        key={categoriaIndex}
                        className="flex items-center gap-2 border rounded bg-slate-800 p-1 ps-2"
                      >
                        <label
                          className="text-sm text-white font-semibold uppercase"
                          style={{ lineHeight: "15px" }}
                        >
                          {categoria}
                        </label>
                        <input
                          onFocus={(e) => e.target.select()}
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-800 bg-slate-100"
                          value={aliquote[comune][year][categoria] ?? ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            const aliquoteCopy = structuredClone(aliquote);

                            aliquoteCopy[comune][year][categoria] =
                              val === "" ? "" : (parseFloat(val) as any);

                            setAliquote(aliquoteCopy);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        );
      })}

      <div className="flex justify-end">
        <Button onClick={() => _setAliquote(aliquote)}>Imposta</Button>
      </div>
    </div>
  );
}

function ImuTableComponent({
  imuData,
  minYear,
}: {
  imuData: iImuYearData;
  minYear?: number;
}) {
  const sortedYears = Object.keys(imuData)
    .map(Number)
    .sort((a, b) => b - a); // sort from newest to oldest

  return (
    <div className="">
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">Anno</th>
            <th className="border px-4 py-2">Rendita - Dominicale - Venale</th>
            <th className="border px-4 py-2">Aliquote</th>
            <th className="border px-4 py-2">Categorie</th>
            <th className="border px-4 py-2">Coefficenti</th>
            <th className="border px-4 py-2">Basi Imponibili</th>
            <th className="border px-4 py-2">IMU</th>
          </tr>
        </thead>
        <tbody>
          {sortedYears.map((year) => {
            if (minYear && year < minYear) return <></>;

            return (
              <tr key={year}>
                <td className="border px-4 py-2">{year}</td>
                <td className="border px-4 py-2">
                  {imuData[year].rendita < 0 ? (
                    <X className="text-red-500 w-4 h-4" />
                  ) : (
                    `€ ${formatNumberIT(imuData[year].rendita)}`
                  )}
                </td>
                <td className="border px-4 py-2">
                  {!imuData[year].aliquote.length ? (
                    <X className="text-red-500 w-4 h-4" />
                  ) : (
                    imuData[year].aliquote.join(" - ")
                  )}
                </td>
                <td className="border px-4 py-2">
                  {!imuData[year].categorie.length ? (
                    <X className="text-red-500 w-4 h-4" />
                  ) : (
                    imuData[year].categorie.join(" - ")
                  )}
                </td>
                <td className="border px-4 py-2">
                  {!imuData[year].coefficienti.length ? (
                    <X className="text-red-500 w-4 h-4" />
                  ) : (
                    imuData[year].coefficienti.join(" - ")
                  )}
                </td>
                <td className="border px-4 py-2">
                  {!imuData[year].basiImponibili.length ? (
                    <X className="text-red-500 w-4 h-4" />
                  ) : (
                    imuData[year].basiImponibili
                      .map((e) => `€ ${formatNumberIT(e)}`)
                      .join(" - ")
                  )}
                </td>
                <td className="border px-4 py-2 font-semibold">
                  {imuData[year].imu < 0 ? (
                    <X className="text-red-500 w-4 h-4" />
                  ) : (
                    `€ ${formatNumberIT(imuData[year].imu)}`
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function SituazioniTableComponent({
  data,
  onChangeVal,
}: {
  data: iVisura;
  onChangeVal: (index: number, val: number) => void;
}) {
  const [editRow, setEditRow] = useState<{ [index: number]: boolean }>({});
  const [tempValues, setTempValues] = useState<{ [index: number]: string }>({});

  const toggleEdit = (index: number) => {
    setEditRow((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));

    setTempValues((prev) => ({
      ...prev,
      [index]: data.situazioni[index].rendita?.toString() || "",
    }));
  };

  const handleSave = (index: number) => {
    const val = parseFloat(tempValues[index]);
    if (!isNaN(val)) {
      onChangeVal(index, val);
    }
    setEditRow((prev) => ({
      ...prev,
      [index]: false,
    }));
  };

  return (
    <div className="">
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">Dal</th>
            <th className="border px-4 py-2">Tipo</th>
            <th className="border px-4 py-2">Unità (foglio-particella-sub)</th>
            <th className="border px-4 py-2">Immobile</th>
            <th className="border px-4 py-2">Categoria</th>
            <th className="border px-4 py-2">Rendita - Dominicale - Venale</th>
          </tr>
        </thead>
        <tbody>
          {data.situazioni.map((situazione, index) => (
            <tr key={index}>
              <td className="border px-4 py-2">
                {situazione.dal &&
                  new Date(situazione.dal).toLocaleDateString()}
              </td>
              <td className="border px-4 py-2">{situazione.type}</td>
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
              <td className="border px-4 py-2">{situazione.immobileType}</td>
              <td className="border px-4 py-2">{situazione.categoria}</td>
              <td className="border px-4 py-2">
                €{" "}
                {editRow[index] ? (
                  <>
                    <input
                      autoFocus
                      type="number"
                      value={tempValues[index] || ""}
                      onChange={(e) =>
                        setTempValues((prev) => ({
                          ...prev,
                          [index]: e.target.value,
                        }))
                      }
                      className="border w-24"
                    />
                    <Button onClick={() => handleSave(index)} variant={"ghost"}>
                      <Check />
                    </Button>
                  </>
                ) : (
                  <>
                    {formatNumberIT(situazione.rendita ?? 0)}
                    <Button onClick={() => toggleEdit(index)} variant={"ghost"}>
                      <Edit />
                    </Button>
                  </>
                )}
              </td>
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [droppedFiles, setDroppedFiles] = useState<DroppedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [modalContent, setModalContent] = useState<ReactElement>();
  const [aliquote, setAliquote] = useState<iAliquoteComune>();
  const [minYear, setMinYear] = useState<number>();

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

        <Button
          onClick={() => {
            // const a = aliquote ?? presetAliquote();
            const a = presetAliquote();

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
          <Edit />
          <ChevronRight />
        </Button>

        <Button
          disabled={!droppedFiles.length || !aliquote}
          onClick={runCalc}
          size={"sm"}
        >
          <Calculator />
          <ChevronRight />
        </Button>

        <Select
          onValueChange={(val) => setMinYear(Number(val))}
          value={minYear?.toString()}
        >
          <SelectTrigger className="">
            {minYear}
            <SelectValue placeholder={"Select year"} />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem
                className="cursor-pointer hover:bg-gray-100 p-1"
                key={year}
                value={year.toString()}
              >
                {year}
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
                        onClick={() =>
                          setModalContent(<PdfModal pdf={fileObj.file} />)
                        }
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

                      <SituazioniTableComponent
                        onChangeVal={(index, val) => {
                          const droppedFilesCopy =
                            structuredClone(droppedFiles);

                          droppedFilesCopy.find(
                            (f) => f._id === fileObj._id
                          )!.refinedData!.situazioni[index].rendita = val;

                          setDroppedFiles(droppedFilesCopy);
                        }}
                        data={fileObj.refinedData}
                      />

                      {fileObj.imuData && (
                        <>
                          <p className="font-semibold mt-4 mb-2">Calcolo IMU</p>
                          <ImuTableComponent
                            minYear={minYear}
                            imuData={fileObj.imuData}
                          />
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

      <Modal
        onClose={() => setModalContent(undefined)}
        content={modalContent}
      />

      <br />
      <br />
    </div>
  );
}

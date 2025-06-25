import { X } from "lucide-react";
import { useState } from "react";
import type { iAliquoteComune } from "../lib/visura/visuraInterfaces";
import { Button } from "./ui/button";

export function AliquoteModal({
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

                  <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-8 gap-4">
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
                          step="0.0001"
                          min="0"
                          className="w-full border rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-800 bg-slate-100"
                          value={
                            typeof aliquote[comune][year][categoria] ===
                            "number"
                              ? aliquote[comune][year][categoria]
                              : ""
                          }
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

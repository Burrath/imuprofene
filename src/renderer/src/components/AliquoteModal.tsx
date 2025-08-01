import { X } from "lucide-react";
import { useState } from "react";
import type { iAliquoteComune } from "../lib/visura/visuraInterfaces";
import { Button } from "./ui/button";

export function AliquoteModal({
  _aliquote,
  _setAliquote,
  minYear,
  maxYear,
}: {
  _aliquote: iAliquoteComune;
  _setAliquote: (e: iAliquoteComune) => void;
  minYear?: number;
  maxYear?: number;
}) {
  const [aliquote, setAliquote] = useState<iAliquoteComune>(_aliquote);

  const codiciComune = Object.keys(aliquote).sort();

  return (
    <div className="space-y-4 p-4">
      {codiciComune.map((codiceComune, comuneIndex) => {
        const years = Object.keys(aliquote[codiceComune].years).sort(
          (a, b) => Number(b) - Number(a)
        );

        return (
          <div key={comuneIndex} className="p-4 bg-gray border shadow">
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {aliquote[codiceComune].comune} ({codiceComune})
            </h2>

            {years.map((year, yearIndex) => {
              if (minYear && Number(year) < minYear) return null;
              if (maxYear && Number(year) > maxYear) return null;

              const categorie = Object.keys(
                aliquote[codiceComune].years[year]
              ).sort();

              return (
                <div key={yearIndex} className="mb-4">
                  <h3 className="text-lg flex items-center justify-between font-semibold text-gray-700 mb-2">
                    <span>Anno: {year}</span>
                    <Button
                      onClick={() => {
                        const aliquoteCopy = structuredClone(aliquote);

                        delete aliquoteCopy[codiceComune].years[year];
                        setAliquote(aliquoteCopy);
                      }}
                      className="text-red-600"
                      variant={"ghost"}
                    >
                      <X />
                    </Button>
                  </h3>

                  <table className="min-w-full border border-gray-300">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="border font-semibold px-2 py-1">
                          Categoria
                        </th>
                        <th className="border font-semibold px-2 py-1">
                          Aliquota
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {categorie.map((categoria, categoriaIndex) => (
                        <tr key={categoriaIndex}>
                          <td className="border px-2 py-1">{categoria}</td>
                          <td className="border ">
                            <input
                              onFocus={(e) => e.target.select()}
                              type="number"
                              step="0.0001"
                              min="0"
                              onWheel={(e) => (e.target as any).blur()}
                              className="w-full px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-800 bg-slate-100"
                              value={
                                typeof aliquote[codiceComune].years[year][
                                  categoria
                                ] === "number"
                                  ? aliquote[codiceComune].years[year][
                                      categoria
                                    ]
                                  : ""
                              }
                              onChange={(e) => {
                                const val = e.target.value;
                                const aliquoteCopy = structuredClone(aliquote);

                                aliquoteCopy[codiceComune].years[year][
                                  categoria
                                ] = val === "" ? "" : (parseFloat(val) as any);

                                setAliquote(aliquoteCopy);
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

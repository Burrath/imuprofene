import { useState } from "react";
import type { iVisura } from "../lib/visura/visuraInterfaces";
import { Button } from "./ui/button";
import { Check, Edit } from "lucide-react";
import { formatNumberIT } from "../lib/utils";

export function SituazioniTableComponent({
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

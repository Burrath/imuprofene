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
    <div className="text-sm">
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">Dal</th>
            <th className="border px-4 py-2">Tipo</th>
            <th className="border px-4 py-2">Unità</th>
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
              <td className="border">
                {situazione.unità && (
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border px-1 py-1">Foglio</th>
                        <th className="border px-1 py-1">Particella</th>
                        <th className="border px-1 py-1">Sub</th>
                      </tr>
                    </thead>
                    <tbody>
                      {situazione.unità.map((u, key) => (
                        <tr key={key}>
                          <td className="border px-1 py-1">{u.foglio ?? ""}</td>
                          <td className="border px-1 py-1">
                            {u.particella ?? ""}
                          </td>
                          <td className="border px-1 py-1">{u.sub ?? ""}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

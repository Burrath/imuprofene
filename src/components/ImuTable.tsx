import { X } from "lucide-react";
import { formatNumberIT } from "../lib/utils";
import type { iImuYearData } from "../lib/visura/visuraInterfaces";
import { CopyPopover } from "./CopyPopover";

export function ImuTableComponent({
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
    <div className="text-sm">
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2">Anno</th>
            <th className="border px-4 py-2">Rendita - Dominicale - Venale</th>
            <th className="border px-4 py-2">Aliquote</th>
            <th className="border px-4 py-2">Categorie</th>
            <th className="border px-4 py-2">Coefficenti</th>
            <th className="border px-4 py-2">Basi Imponibili</th>
            <th className="border px-4 py-2">IMU Anticipo</th>
            <th className="border px-4 py-2">IMU Saldo</th>
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
                    imuData[year].aliquote
                      .map((e) => `${formatNumberIT(e)}%`)
                      .join(" - ")
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
                  {typeof imuData[year].imuAnticipo !== "number" ? (
                    <X className="text-red-500 w-4 h-4" />
                  ) : (
                    <>
                      € {formatNumberIT(imuData[year].imuAnticipo)}
                      <CopyPopover
                        value={imuData[year].imuAnticipo.toFixed(2)}
                      />
                    </>
                  )}
                </td>
                <td className="border px-4 py-2 font-semibold">
                  {typeof imuData[year].imuSaldo !== "number" ? (
                    <X className="text-red-500 w-4 h-4" />
                  ) : (
                    <>
                      € {formatNumberIT(imuData[year].imuSaldo)}
                      <CopyPopover value={imuData[year].imuSaldo.toFixed(2)} />
                    </>
                  )}
                </td>
                <td className="border px-4 py-2 font-semibold">
                  {typeof imuData[year].imu !== "number" ? (
                    <X className="text-red-500 w-4 h-4" />
                  ) : (
                    <>
                      € {formatNumberIT(imuData[year].imu)}
                      <CopyPopover value={imuData[year].imu.toFixed(2)} />
                    </>
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

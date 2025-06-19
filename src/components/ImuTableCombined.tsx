import { X } from "lucide-react";
import { formatNumberIT } from "../lib/utils";

import type { DroppedFile } from "../App";
import { CopyPopover } from "./CopyPopover";

export function ImuTableCombined({
  droppedFiles,
  minYear,
}: {
  droppedFiles: DroppedFile[];
  minYear?: number;
}) {
  const currentYear = new Date().getFullYear();
  const years = Array.from(
    { length: currentYear - 1970 + 1 },
    (_, i) => 1970 + i
  ).reverse();

  return (
    <div className="text-sm w-full">
      {years.map((year) => {
        if (minYear && year < minYear) return <></>;

        return (
          <div className="mb-4" key={year}>
            <p className="font-semibold text-lg mb-1">{year}</p>
            <table className="w-full border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-4 py-2">File</th>
                  <th className="border px-4 py-2">IMU Anticipo</th>
                  <th className="border px-4 py-2">IMU Saldo</th>
                  <th className="border px-4 py-2">IMU</th>
                </tr>
              </thead>
              <tbody>
                {droppedFiles.map((fileObj) => {
                  if (minYear && year < minYear) return <></>;
                  const imuData = fileObj.imuData?.[year];
                  if (!imuData) return <></>;

                  return (
                    <tr key={fileObj.file.name}>
                      <td className="border px-4 py-2">{fileObj.file.name}</td>
                      <td className="border px-4 py-2 font-semibold">
                        {imuData.imuAnticipo < 0 ? (
                          <X className="text-red-500 w-4 h-4" />
                        ) : (
                          `€ ${formatNumberIT(imuData.imuAnticipo)}`
                        )}
                        {/* ...Popover */}
                      </td>
                      <td className="border px-4 py-2 font-semibold">
                        {imuData.imuSaldo < 0 ? (
                          <X className="text-red-500 w-4 h-4" />
                        ) : (
                          `€ ${formatNumberIT(imuData.imuSaldo)}`
                        )}
                        {/* ...Popover */}
                      </td>
                      <td className="border px-4 py-2 font-semibold">
                        {imuData.imu < 0 ? (
                          <X className="text-red-500 w-4 h-4" />
                        ) : (
                          `€ ${formatNumberIT(imuData.imu)}`
                        )}
                        {/* ...Popover */}
                      </td>
                    </tr>
                  );
                })}

                {/* Totals row */}
                <tr className="bg-gray-200 font-bold">
                  <td className="border px-4 py-2">Totale</td>
                  <td className="border px-4 py-2">
                    €{" "}
                    {formatNumberIT(
                      droppedFiles.reduce((sum, fileObj) => {
                        const value = fileObj.imuData?.[year]?.imuAnticipo ?? 0;
                        return sum + (value > 0 ? value : 0);
                      }, 0)
                    )}
                    <CopyPopover
                      value={droppedFiles.reduce((sum, fileObj) => {
                        const value = fileObj.imuData?.[year]?.imuAnticipo ?? 0;
                        return sum + (value > 0 ? value : 0);
                      }, 0)}
                    />
                  </td>
                  <td className="border px-4 py-2">
                    €{" "}
                    {formatNumberIT(
                      droppedFiles.reduce((sum, fileObj) => {
                        const value = fileObj.imuData?.[year]?.imuSaldo ?? 0;
                        return sum + (value > 0 ? value : 0);
                      }, 0)
                    )}
                    <CopyPopover
                      value={droppedFiles.reduce((sum, fileObj) => {
                        const value = fileObj.imuData?.[year]?.imuSaldo ?? 0;
                        return sum + (value > 0 ? value : 0);
                      }, 0)}
                    />
                  </td>
                  <td className="border px-4 py-2">
                    €{" "}
                    {formatNumberIT(
                      droppedFiles.reduce((sum, fileObj) => {
                        const value = fileObj.imuData?.[year]?.imu ?? 0;
                        return sum + (value > 0 ? value : 0);
                      }, 0)
                    )}
                    <CopyPopover
                      value={droppedFiles.reduce((sum, fileObj) => {
                        const value = fileObj.imuData?.[year]?.imu ?? 0;
                        return sum + (value > 0 ? value : 0);
                      }, 0)}
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

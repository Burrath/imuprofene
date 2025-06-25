import { X } from "lucide-react";
import { formatNumberIT } from "../lib/utils";

import { CopyPopover } from "./CopyPopover";
import { iF24 } from "@renderer/lib/visura/f24Interfaces";

export function F24Table({ f24 }: { f24: iF24 }) {
  const totalDebito =
    f24.voci?.reduce((sum, voce) => {
      return (
        sum + (typeof voce.importoDebito === "number" ? voce.importoDebito : 0)
      );
    }, 0) ?? 0;

  const totalCredito =
    f24.voci?.reduce((sum, voce) => {
      return (
        sum +
        (typeof voce.importoCredito === "number" ? voce.importoCredito : 0)
      );
    }, 0) ?? 0;

  return (
    <div className="text-sm">
      <table className="min-w-full border border-gray-300">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-2 py-1">Codice Comune</th>
            <th className="border px-2 py-1">Causale Tributo</th>
            <th className="border px-2 py-1">Estremi</th>
            <th className="border px-2 py-1">Periodo</th>
            <th className="border px-2 py-1">Importo Debito</th>
            <th className="border px-2 py-1">Importo Credito</th>
          </tr>
        </thead>
        <tbody>
          {f24.voci?.length ? (
            f24.voci.map((voce, idx) => (
              <tr key={idx}>
                <td className="border px-2 py-1">
                  {voce.codice || <X className="text-red-500 w-4 h-4" />}
                </td>
                <td className="border px-2 py-1">
                  {voce.causaleTributo || (
                    <X className="text-red-500 w-4 h-4" />
                  )}
                </td>
                <td className="">
                  {voce.estremi ? (
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="border px-1 py-1">Ravv</th>
                          <th className="border px-1 py-1">Var</th>
                          <th className="border px-1 py-1">Acc</th>
                          <th className="border px-1 py-1">Sal</th>
                          <th className="border px-1 py-1"># Imm</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="border px-1 py-1 text-center">
                            {voce.estremi.ravv}
                          </td>
                          <td className="border px-1 py-1 text-center">
                            {voce.estremi.immobVariati}
                          </td>
                          <td className="border px-1 py-1 text-center">
                            {voce.estremi.acc}
                          </td>
                          <td className="border px-1 py-1 text-center">
                            {voce.estremi.saldo}
                          </td>
                          <td className="border px-1 py-1 text-center">
                            {voce.estremi.numberoImmobili}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <X className="text-red-500 w-4 h-4 m-auto" />
                  )}
                </td>

                <td className="border px-2 py-1">
                  {voce.periodo || <X className="text-red-500 w-4 h-4" />}
                </td>
                <td
                  className={`border px-2 py-1 font-semibold ${
                    typeof voce.importoDebito !== "number" ||
                    voce.importoDebito === 0
                      ? "font-light bg-gray-50"
                      : ""
                  }`}
                >
                  {typeof voce.importoDebito !== "number" ||
                  voce.importoDebito === 0 ? (
                    <X className="text-red-500 w-4 h-4" />
                  ) : (
                    <>
                      € {formatNumberIT(voce.importoDebito)}
                      <CopyPopover value={voce.importoDebito.toFixed(2)} />
                    </>
                  )}
                </td>

                <td
                  className={`border px-2 py-1 font-semibold ${
                    typeof voce.importoCredito !== "number" ||
                    voce.importoCredito === 0
                      ? "font-light bg-gray-50"
                      : ""
                  }`}
                >
                  {typeof voce.importoCredito !== "number" ||
                  voce.importoCredito === 0 ? (
                    <X className="text-red-500 w-4 h-4" />
                  ) : (
                    <>
                      € {formatNumberIT(voce.importoCredito)}
                      <CopyPopover value={voce.importoCredito.toFixed(2)} />
                    </>
                  )}
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td
                colSpan={7}
                className="border px-4 py-4 text-center text-gray-500"
              >
                Nessuna voce F24 disponibile
              </td>
            </tr>
          )}

          {f24.voci?.length && f24.voci?.length > 1 ? (
            <tr className="bg-gray-50 font-bold">
              <td colSpan={5} className="border px-2 py-1 text-right">
                Totali:
              </td>
              <td className="border px-2 py-1">
                € {formatNumberIT(totalDebito)}
                <CopyPopover value={totalDebito.toFixed(2)} />
              </td>
              <td className="border px-2 py-1">
                € {formatNumberIT(totalCredito)}
                <CopyPopover value={totalCredito.toFixed(2)} />
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

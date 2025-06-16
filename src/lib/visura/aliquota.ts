export type CategoriaCatastale =
  | "A"
  | "A1"
  | "A2"
  | "A3"
  | "A4"
  | "A5"
  | "A6"
  | "A7"
  | "A8"
  | "A9"
  | "A10"
  | "A11"
  | "B"
  | "B1"
  | "B2"
  | "B3"
  | "B4"
  | "B5"
  | "B6"
  | "B7"
  | "B8"
  | "C"
  | "C1"
  | "C2"
  | "C3"
  | "C4"
  | "C5"
  | "C6"
  | "C7"
  | "D"
  | "D1"
  | "D2"
  | "D3"
  | "D4"
  | "D5"
  | "D6"
  | "D7"
  | "D8"
  | "D9"
  | "D10"
  | "E"
  | "E1"
  | "E2"
  | "E3"
  | "E4"
  | "E5"
  | "E6"
  | "E7"
  | "E8"
  | "E9"
  | "T" // terreni
  | "area_fabbricabile"
  | "terreno_agricolo";

export interface iAliquotePerYear {
  [categoria: string]: number;
}

export interface iAliquoteComune {
  comuni: {
    [comune: string]: {
      aliquote: {
        [anno: string]: {
          [categoria: string]: number;
        };
      };
    };
  };
}

export default function getAliquotaFromComune(
  comune: string,
  categoria: string,
  year: string,
  aliquoteComuni: iAliquoteComune
): number {
  const normalizedComune = comune.trim().toLowerCase();
  const normalizedCategoria = categoria.replace(/\//g, "").toUpperCase();

  // Cerca il comune normalizzato dentro `aliquoteComuni.comuni`
  const comuneData = Object.entries(aliquoteComuni.comuni).find(
    ([key]) => key.trim().toLowerCase() === normalizedComune
  )?.[1];

  if (!comuneData) return -1;

  const aliquoteAnno = comuneData.aliquote[year];
  if (!aliquoteAnno) return -1;

  // Prova prima la categoria esatta, poi il prefisso (prima lettera), poi fallback
  return (
    aliquoteAnno[normalizedCategoria] ??
    aliquoteAnno[normalizedCategoria[0]] ??
    aliquoteAnno["default"] ??
    -1
  );
}

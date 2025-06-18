export enum SITUAZIONE_TYPE {
  RenditaProposta = "RenditaProposta", // da usare SOLO se è l'ultima in alto
  RenditaNonRettificata = "RenditaNonRettificata", // da usare (non rettificata in 12 mesi quindi valida)
  RenditaValidata = "RenditaValidata", // da usare
  RenditaRettificata = "RenditaRettificata", // da usare (modifica rispetto alla proposta precendente)
}

export enum IMMOBILE_TYPE {
  Fabbricato = "Fabbricato",
  TerrenoEdificabile = "TerrenoEdificabile",
  TerrenoAgricolo = "TerrenoAgricolo",
}

export interface iUnitàVisura {
  foglio?: string;
  particella?: string;
  sub?: string;
}

export interface iSituazioneVisura {
  dal?: Date;
  type?: SITUAZIONE_TYPE;
  unità?: iUnitàVisura[];
  categoria?: string;
  rendita?: number; // used for reddito dominicale and valore Venale
  immobileType?: IMMOBILE_TYPE;
}

export interface iVisura {
  numero: string;
  situazioni: iSituazioneVisura[];
  comune: string;
  codiceComune: string;
}

export interface iAliquoteComune {
  [comune: string]: {
    [year: string]: {
      [categoria: string]: number | undefined;
    };
  };
}

export interface iImuYearData {
  [year: number]: {
    rendita: number;
    imu: number;
    imuAnticipo: number;
    imuSaldo: number;
    aliquote: number[];
    categorie: string[];
    coefficienti: number[];
    basiImponibili: number[];
  };
}

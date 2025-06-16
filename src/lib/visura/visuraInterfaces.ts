export enum SITUAZIONE_TYPE {
  RenditaProposta = "RenditaProposta", // da usare SOLO se è l'ultima in alto
  RenditaNonRettificata = "RenditaNonRettificata", // da usare (non rettificata in 12 mesi quindi valida)
  RenditaValidata = "RenditaValidata", // da usare
  RenditaRettificata = "RenditaRettificata", // da usare (modifica rispetto alla proposta precendente)
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
  rendita?: number;
}

export interface iVisura {
  numero: string;
  situazioni: iSituazioneVisura[];
  comune: string;
  codiceComune: string;
}

export interface iImuYearData {
  [year: number]: { rendita: number; imu: number };
}

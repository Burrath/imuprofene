export interface iF24voce {
  sezione?: string;
  codice?: string;
  causaleTributo?: string;
  estremi?: {
    ravv?: string;
    immobVariati?: string;
    acc?: string;
    saldo?: string;
    numberoImmobili?: string;
  };
  periodo?: string;
  importoDebito?: number;
  importoCredito?: number;
}

export interface iF24 {
  dataVersamento?: Date;
  voci?: iF24voce[];
}

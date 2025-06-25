export interface iF24 {
  dataVersamento?: Date;
  voci?: {
    sezione?: string;
    codice?: string;
    causale?: string;
    estremi?: string;
    periodo?: string;
    importoDebito?: string;
    importoCredito?: string;
  }[];
}

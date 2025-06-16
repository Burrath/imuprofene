export enum CATEGORIA_CATASTALE {
  /** Abitazione principale e assimilate (Cat. da A/2 ad A/7) e pertinenze (C/2, C/6, C/7) */
  AbitazionePrincipale = "AbitazionePrincipale",
  /** Abitazione principale di pregio (Cat. A/1, A/8, A/9) e pertinenze (C/2, C/6, C/7) */
  AbitazionePrincipalePregio = "AbitazionePrincipalePregio",
  /** Abitazioni assegnate dagli Istituti Autonomi Case Popolari (ex IACP/ARES/ALER) */
  AbitazioniIACP = "AbitazioniIACP",
  /** Altre abitazioni – immobili Cat. A (tranne A/10) */
  AltreAbitazioniCatA = "AltreAbitazioniCatA",
  /** Abitazione concessa in comodato gratuito (tranne cat. A/1, A/8, A/9) – riduzione 50 % imponibile */
  ComodatoRiduzione50 = "ComodatoRiduzione50",
  /** Abitazione in comodato gratuito senza riduzione imponibile */
  ComodatoSenzaRiduzione = "ComodatoSenzaRiduzione",
  /** Abitazioni locate a canone concordato (riduzione al 75 %) */
  CanoneConcordatoRiduzione75 = "CanoneConcordatoRiduzione75",
  /** Cat. A/10 – Uffici e studi privati */
  UfficiStudiPrivatiA10 = "UfficiStudiPrivatiA10",
  /** Cat. C/1 – Negozi e botteghe */
  NegoziBottegheC1 = "NegoziBottegheC1",
  /** Cat. C/2 – Magazzini e locali di deposito */
  MagazziniDepositoC2 = "MagazziniDepositoC2",
  /** Cat. C/3 – Laboratori per arti e mestieri */
  LaboratoriArtigianaliC3 = "LaboratoriArtigianaliC3",
  /** Cat. B, C/4, C/5 – Fabbricati a uso collettivo */
  FabbricatiComuniBC4C5 = "FabbricatiComuniBC4C5",
  /** Cat. C/6, C/7 – Stalle, scuderie, rimesse, autorimesse, tettoie */
  RimesseAutorimesseC6C7 = "RimesseAutorimesseC6C7",
  /** Cat. D (tranne D/5 e D/10) – Immobili industriali e commerciali */
  ImmobiliIndustrialiCommercialiD = "ImmobiliIndustrialiCommercialiD",
  /** Cat. D/5 – Istituti di credito e assicurazioni */
  IstitutiCreditoAssicurazioniD5 = "IstitutiCreditoAssicurazioniD5",
  /** Cat. D/10 – Fabbricati rurali strumentali all’attività agricola */
  FabbricatiRuraliStrumentaliD10 = "FabbricatiRuraliStrumentaliD10",
  /** Fabbricati rurali strumentali (Cat. A, C/2, C/6, C/7) */
  FabbricatiRuraliStrumentaliAC2C6C7 = "FabbricatiRuraliStrumentaliAC2C6C7",
  /** Beni merce – Realizzati da imprese edili, destinati alla vendita, rimasti invenduti */
  BeniMerce = "BeniMerce",
  /** Aree fabbricabili */
  AreeFabbricabili = "AreeFabbricabili",
  /** Terreni (non agricoli) */
  Terreni = "Terreni",
  /** Terreni agricoli */
  TerreniAgricoli = "TerreniAgricoli",
  /** Terreni agricoli posseduti e condotti da operatori iscritti alla previdenza agricola */
  TerreniAgricoliIscritti = "TerreniAgricoliIscritti",
}

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
}

export interface iImuYearData {
  [year: number]: { rendita: number; imu: number };
}

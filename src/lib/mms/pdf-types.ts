export interface CompanySettings {
  logo?: string | null;
  nomCommercial: string;
  raisonSociale: string;
  activite: string;
  adresse: string;
  ville: string;
  pays: string;
  telephone: string;
  whatsapp?: string;
  email: string;
  siteWeb: string;
  rccm: string;
  cc: string;
  ifu: string;
  devise: string;
  cachet?: string | null;
  signature?: string | null;
  responsable: string;
  fonction: string;
}

export interface DocumentItem {
  description: string;
  quantite: number;
  prixUnitaire: number;
  remise: number;
  tva: number;
  montant: number;
}

export interface DocumentTotals {
  sousTotal: number;
  remise: number;
  tva: number;
  totalTTC: number;
}

export interface QuotationData {
  numero: string;
  date: string;
  dateExpiration: string;
  statut: string;
  client: {
    nom: string;
    entreprise?: string;
    telephone?: string;
    email?: string;
    adresse?: string;
  };
  items: DocumentItem[];
  totals: DocumentTotals;
  conditionsPaiement: string;
  observations?: string;
}

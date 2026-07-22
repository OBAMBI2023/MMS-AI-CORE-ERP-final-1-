export interface CompanySettings {
  logo_url?: string | null;
  signature_url?: string | null;
  stamp_url?: string | null;
  company_name: string;
  trade_name?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  rccm?: string | null;
  tax_number?: string | null;
  tax_regime?: string | null;
  vat_rate?: number | null;
  currency: string;
  quote_prefix: string;
  invoice_prefix: string;
  receipt_prefix: string;
  decimals: number;
  date_format: string;
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

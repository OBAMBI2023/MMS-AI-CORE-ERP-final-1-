export type SearchModule = 
  | 'Clients' 
  | 'Ventes' 
  | 'Fournisseurs' 
  | 'Services' 
  | 'Achats' 
  | 'Charges' 
  | 'Devis' 
  | 'Paramètres';

export interface SearchResult {
  id: string;
  title: string;
  description: string;
  module: SearchModule;
  url: string;
  icon: string;
}

export interface SearchState {
  query: string;
  results: SearchResult[];
  isLoading: boolean;
  isOpen: boolean;
}

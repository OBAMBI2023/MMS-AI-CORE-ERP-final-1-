import { supabase } from "@/integrations/supabase/client";

export type ERPModule =
  "clients" | "fournisseurs" | "services" | "ventes" | "devis" | "achats" | "depenses";

export interface ERPModuleContext {
  module: ERPModule;
  getMetadata: () => Promise<any>;
  getStatistics: () => Promise<any>;
  getSearchableData: () => Promise<any>;
}

export const getERPContext = async (): Promise<Record<ERPModule, any>> => {
  // Fetch data for all modules
  const [clients, fournisseurs, services, ventes, devis, achats, depenses] = await Promise.all([
    supabase.from("clients").select("*"),
    supabase.from("fournisseurs").select("*"),
    supabase.from("services").select("*"),
    supabase.from("ventes").select("*"),
    supabase.from("devis").select("*"),
    supabase.from("achats").select("*"),
    supabase.from("depenses").select("*"),
  ]);

  return {
    clients: clients.data,
    fournisseurs: fournisseurs.data,
    services: services.data,
    ventes: ventes.data,
    devis: devis.data,
    achats: achats.data,
    depenses: depenses.data,
  };
};

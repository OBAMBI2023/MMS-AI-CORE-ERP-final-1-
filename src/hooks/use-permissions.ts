import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function usePermissions() {
  return {
    data: [
      "dashboard.view",
      "assistant.use",
      "ventes.view",
      "clients.view",
      "achats.view",
      "settings.manage",
    ],
  };
}

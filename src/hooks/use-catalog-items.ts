import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { formatSupabaseError } from "@/lib/supabase-error";

export type CatalogItem = {
  id: string;
  type: "product" | "service";
  category_id: string | null;
  category: string;
  name: string;
  price: number;
  cost_price: number;
  unit: string;
  photo_url: string | null;
  stock: number | null;
  manage_stock: boolean;
  stock_alert_threshold: number;
  active: boolean;
  created_at: string;
};

export function useCatalogItems(options: { activeOnly?: boolean } = {}) {
  const { profile, loading: tenantLoading } = useTenant();
  const tenantId = profile?.tenant_id;
  const activeOnly = options.activeOnly ?? false;
  const [data, setData] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (tenantLoading) return;

    setLoading(true);
    setError(null);
    try {
      if (!tenantId) {
        throw new Error(
          "Impossible de charger le catalogue : aucun tenant n’est associé à ce profil.",
        );
      }
      let query = supabase
        .from("services")
        .select(
          "id, type, category_id, category, name, price, cost_price, unit, photo_url, stock, manage_stock, stock_alert_threshold, active, created_at",
        )
        .eq("tenant_id", tenantId);
      if (activeOnly) query = query.eq("active", true);
      const { data: rows, error: queryError } = await query.order("created_at", {
        ascending: false,
      });
      if (queryError) throw queryError;
      setData((rows ?? []) as CatalogItem[]);
    } catch (caught) {
      setData([]);
      setError(formatSupabaseError(caught));
    } finally {
      setLoading(false);
    }
  }, [activeOnly, tenantId, tenantLoading]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, loading: tenantLoading || loading, error, reload: load };
}

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import { HOTEL_BACKUP_MODULE_ICONS } from "@/lib/backup-modules";
import type { LucideIcon } from "lucide-react";

export interface HotelBackupModuleOption {
  code: string;
  label: string;
  icon: LucideIcon;
}

type ModuleRelation = { code: string; name: string } | { code: string; name: string }[] | null;

const MODULE_ORDER = Object.keys(HOTEL_BACKUP_MODULE_ICONS);

// Derives the Hotel backup module checklist from tenant_modules/erp_modules
// (the same tables useTenantModules() reads) rather than hardcoding a second
// label registry: HOTEL_BACKUP_MODULE_ICONS only decides which codes are
// backup-eligible and which icon they get, the display label always comes
// live from erp_modules.name.
export function useHotelBackupModules() {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;

  return useQuery({
    queryKey: ["hotel-backup-modules", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_modules")
        .select("enabled, erp_modules!inner(code, name)")
        .eq("enabled", true);
      if (error) throw error;

      const options: HotelBackupModuleOption[] = [];
      for (const row of data ?? []) {
        const rel = row.erp_modules as ModuleRelation;
        const items = Array.isArray(rel) ? rel : rel ? [rel] : [];
        for (const item of items) {
          if (!Object.prototype.hasOwnProperty.call(HOTEL_BACKUP_MODULE_ICONS, item.code)) continue;
          options.push({
            code: item.code,
            label: item.name,
            icon: HOTEL_BACKUP_MODULE_ICONS[item.code],
          });
        }
      }

      return options.sort((a, b) => MODULE_ORDER.indexOf(a.code) - MODULE_ORDER.indexOf(b.code));
    },
    enabled: Boolean(tenantId),
    staleTime: 30_000,
  });
}

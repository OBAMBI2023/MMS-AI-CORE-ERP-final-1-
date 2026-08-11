import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";
import type { Tables } from "@/integrations/supabase/types";

export type TenantBackup = Tables<"tenant_backups">;

const RUNNING_STATUSES = new Set(["en_attente", "en_cours"]);

export function useTenantBackups() {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["tenant-backups", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tenant_backups")
        .select("*")
        .eq("tenant_id", tenantId as string)
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data as TenantBackup[];
    },
    enabled: Boolean(tenantId),
    refetchInterval: (q) =>
      q.state.data?.some((r) => RUNNING_STATUSES.has(r.status)) ? 3000 : false,
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["tenant-backups", tenantId] });

  const createBackup = useMutation({
    mutationFn: async (modules: string[]) => {
      const { data, error } = await supabase.functions.invoke("create-backup", {
        body: { modules },
      });
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: invalidate,
  });

  const retryBackup = useMutation({
    mutationFn: async (backup: TenantBackup) => {
      const modules = Array.isArray(backup.modules) ? (backup.modules as string[]) : [];
      const { data, error } = await supabase.functions.invoke("create-backup", {
        body: { modules },
      });
      if (error) throw error;
      return data as { id: string };
    },
    onSuccess: invalidate,
  });

  return { ...query, createBackup, retryBackup };
}

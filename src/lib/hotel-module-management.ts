import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../integrations/supabase/types";
import { formatSupabaseError } from "./supabase-error.ts";

export type ManageHotelTenantModuleData = {
  tenantId: string;
  moduleId: string;
  enabled: boolean;
};

export type ManageHotelTenantModuleContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
};

export type SuperAdminGuard = (
  supabase: SupabaseClient,
  userId: string,
) => Promise<void>;

export async function executeManageHotelTenantModule(
  context: ManageHotelTenantModuleContext,
  data: ManageHotelTenantModuleData,
  authorize: SuperAdminGuard,
) {
  await authorize(context.supabase, context.userId);
  const { error } = await context.supabase.rpc("manage_hotel_tenant_module", {
    requested_tenant_id: data.tenantId,
    requested_module_id: data.moduleId,
    requested_enabled: data.enabled,
    requested_actor_id: context.userId,
  });
  if (error) throw new Error(formatSupabaseError(error));
  return { success: true };
}

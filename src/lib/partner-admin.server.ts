import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { Json } from "@/integrations/supabase/types";
import { formatSupabaseError } from "@/lib/supabase-error";

export type PartnerTenant = {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  assignedAt: string;
  pack: { id: string; name: string; code: string } | null;
  subscription: {
    status: string;
    billingCycle: string;
    startsAt: string | null;
    endsAt: string | null;
    trialEndsAt: string | null;
  } | null;
  modules: { id: string; code: string; name: string; enabled: boolean }[];
};

export type PartnerDashboard = {
  partner: { id: string; name: string; code: string };
  tenants: PartnerTenant[];
  history: {
    id: string;
    action: string;
    tenantId: string | null;
    metadata: Json;
    createdAt: string;
  }[];
};

export type AuthenticatedDestination =
  | "/super-admin"
  | "/partner"
  | "/app"
  | "/403";

async function isPlatformAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(formatSupabaseError(error));
  return Boolean(data);
}

async function requirePartnerMembership(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  if (await isPlatformAdmin(supabase, userId)) {
    throw new Error("Partner access denied: Platform Admin forbidden.");
  }

  const { data: partnerId, error: partnerIdError } =
    await supabase.rpc("current_partner_id");
  if (partnerIdError) throw new Error(formatSupabaseError(partnerIdError));
  if (!partnerId) {
    throw new Error("Partner access denied: active partner membership required.");
  }

  const { data: membership, error } = await supabase
    .from("partner_users")
    .select("partner_id")
    .eq("user_id", userId)
    .eq("partner_id", partnerId)
    .maybeSingle();
  if (error) throw new Error(formatSupabaseError(error));
  if (!membership) throw new Error("Accès refusé : Partner Admin requis.");
  return partnerId;
}

export const getPartnerAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isPartnerAdmin: boolean }> => {
    const { data, error } = await context.supabase.rpc("current_partner_id");
    if (error) throw new Error(formatSupabaseError(error));
    return { isPartnerAdmin: Boolean(data) };
  });

export const getAuthenticatedDestination = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AuthenticatedDestination> => {
    if (await isPlatformAdmin(context.supabase, context.userId)) {
      return "/super-admin";
    }

    const { data: partnerId, error: partnerError } =
      await context.supabase.rpc("current_partner_id");
    if (partnerError) throw new Error(formatSupabaseError(partnerError));
    if (partnerId) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { error: logError } = await supabaseAdmin.from("partner_activity_logs").insert({
        partner_id: partnerId,
        user_id: context.userId,
        action: "partner.login",
      });
      if (logError) throw new Error(formatSupabaseError(logError));
      return "/partner";
    }

    const { data: profile, error: profileError } = await context.supabase
      .from("profiles")
      .select("id, tenant_id")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileError) throw new Error(formatSupabaseError(profileError));

    return profile?.tenant_id ? "/app" : "/403";
  });

export const getPartnerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PartnerDashboard> => {
    const partnerId = await requirePartnerMembership(context.supabase, context.userId);

    const [
      partnerResult,
      assignmentsResult,
      tenantsResult,
      subscriptionsResult,
      tenantModulesResult,
      modulesResult,
      tenantPacksResult,
      packsResult,
      historyResult,
    ] = await Promise.all([
      context.supabase.from("partners").select("id, name, code").eq("id", partnerId).single(),
      context.supabase.from("partner_tenants").select("tenant_id, assigned_at"),
      context.supabase.from("tenants").select("id, name, slug, logo_url"),
      context.supabase
        .from("subscriptions")
        .select("tenant_id, status, billing_cycle, starts_at, ends_at, trial_ends_at"),
      context.supabase.from("tenant_modules").select("tenant_id, module_id, enabled"),
      context.supabase.from("erp_modules").select("id, code, name").eq("is_active", true),
      context.supabase.from("tenant_module_packs").select("tenant_id, pack_id"),
      context.supabase.from("module_packs").select("id, name, code"),
      context.supabase
        .from("partner_activity_logs")
        .select("id, action, tenant_id, metadata, created_at")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    for (const result of [
      partnerResult,
      assignmentsResult,
      tenantsResult,
      subscriptionsResult,
      tenantModulesResult,
      modulesResult,
      tenantPacksResult,
      packsResult,
      historyResult,
    ]) {
      if (result.error) throw new Error(formatSupabaseError(result.error));
    }

    const assignedAt = new Map(
      (assignmentsResult.data ?? []).map((row) => [row.tenant_id, row.assigned_at]),
    );
    const subscriptions = new Map(
      (subscriptionsResult.data ?? []).map((row) => [row.tenant_id, row]),
    );
    const moduleState = new Map(
      (tenantModulesResult.data ?? []).map((row) => [
        `${row.tenant_id}:${row.module_id}`,
        row.enabled,
      ]),
    );
    const packByTenant = new Map(
      (tenantPacksResult.data ?? []).map((row) => [row.tenant_id, row.pack_id]),
    );
    const packs = new Map((packsResult.data ?? []).map((row) => [row.id, row]));

    const tenants = (tenantsResult.data ?? [])
      .filter((tenant) => assignedAt.has(tenant.id))
      .map((tenant): PartnerTenant => {
        const subscription = subscriptions.get(tenant.id);
        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          logoUrl: tenant.logo_url,
          assignedAt: assignedAt.get(tenant.id)!,
          pack: packs.get(packByTenant.get(tenant.id) ?? "") ?? null,
          subscription: subscription
            ? {
                status: subscription.status,
                billingCycle: subscription.billing_cycle,
                startsAt: subscription.starts_at,
                endsAt: subscription.ends_at,
                trialEndsAt: subscription.trial_ends_at,
              }
            : null,
          modules: (modulesResult.data ?? []).map((module) => ({
            ...module,
            enabled: moduleState.get(`${tenant.id}:${module.id}`) ?? false,
          })),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));

    const { error: logError } = await context.supabase.from("partner_activity_logs").insert({
      partner_id: partnerId,
      user_id: context.userId,
      action: "portal.view",
      metadata: { tenant_count: tenants.length },
    });
    if (logError) throw new Error(formatSupabaseError(logError));

    return {
      partner: partnerResult.data!,
      tenants,
      history: (historyResult.data ?? []).map((row) => ({
        id: row.id,
        action: row.action,
        tenantId: row.tenant_id,
        metadata: row.metadata,
        createdAt: row.created_at,
      })),
    };
  });

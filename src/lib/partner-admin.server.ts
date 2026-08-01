import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import type { Json } from "@/integrations/supabase/types";
import { formatSupabaseError } from "@/lib/supabase-error";
import { getPasswordRedirectUrl } from "@/lib/app-url.server";
import { resendExistingAuthInvitation } from "@/lib/partner-invitation";
import { z } from "zod";

export type PartnerTenant = {
  id: string;
  name: string;
  slug: string;
  loginUrl: string | null;
  logoPath: string | null;
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
  partner: { id: string; name: string; code: string; creditBalance: number };
  subscription: {
    status: string;
    startsAt: string;
    expiresAt: string;
    offer: {
      id: string;
      name: string;
      price: number;
      includedTenantCredits: number;
      durationDays: number;
      maxTrials: number;
      trialDays: number;
      packName: string;
    };
  } | null;
  totals: {
    credited: number;
    consumed: number;
    activeTenants: number;
    trialsCreated: number;
    activeTrials: number;
    convertedTrials: number;
    conversionRate: number;
    commissionsGenerated: number;
  };
  availableModules: { id: string; code: string; name: string }[];
  activityProfiles: { code: string; name: string; description: string | null }[];
  payments: {
    id: string; amount: number; currency: string; reference: string; status: string; createdAt: string;
  }[];
  creditTransactions: {
    id: string; tenantId: string | null; type: string; credits: number; balanceAfter: number;
    reason: string; reference: string | null; createdAt: string;
  }[];
  trials: {
    id: string; tenantId: string; tenantName: string; tenantSlug: string;
    loginUrl: string | null; email: string; managerName: string | null;
    sector: string | null; city: string | null; status: string;
    startsAt: string; expiresAt: string; createdAt: string;
    commissionAmount: number;
  }[];
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
  | "/demande-en-attente"
  | "/403";

async function signCompanyAsset(
  admin: any,
  path: string | null,
): Promise<string | null> {
  if (!path || /^(?:https?:|data:|blob:)/i.test(path)) return path;
  const { data, error } = await admin.storage
    .from("company-assets")
    .createSignedUrl(path, 60 * 60);
  if (error) throw new Error(formatSupabaseError(error));
  return data?.signedUrl ?? null;
}

export const getLoginTenantBranding = createServerFn({ method: "GET" })
  .validator(z.object({ slug: z.string().trim().min(1).max(120) }))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tenant, error } = await (supabaseAdmin as any)
      .from("tenants")
      .select("id, name, logo_url, is_active, deleted_at")
      .eq("slug", data.slug)
      .eq("is_active", true)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw new Error(formatSupabaseError(error));
    if (!tenant) return null;
    return {
      id: tenant.id as string,
      name: tenant.name as string,
      logoUrl: await signCompanyAsset(supabaseAdmin, tenant.logo_url as string | null),
    };
  });

export const getPartnerTenantLogoSignature = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ tenantId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const partnerId = await requirePartnerMembership(context.supabase, context.userId);
    const { data: assignment, error: assignmentError } = await context.supabase
      .from("partner_tenants")
      .select("tenant_id")
      .eq("partner_id", partnerId)
      .eq("tenant_id", data.tenantId)
      .maybeSingle();
    if (assignmentError) throw new Error(formatSupabaseError(assignmentError));
    if (!assignment) throw new Error("Accès refusé au logo de ce tenant.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tenant, error: tenantError } = await (supabaseAdmin as any)
      .from("tenants")
      .select("logo_url, deleted_at")
      .eq("id", data.tenantId)
      .is("deleted_at", null)
      .maybeSingle();
    if (tenantError) throw new Error(formatSupabaseError(tenantError));
    const path = tenant?.logo_url as string | null | undefined;
    if (!path) return { path: null, signedUrl: null, expiresAt: null };
    if (/^(?:https?:|data:|blob:)/i.test(path)) {
      return { path, signedUrl: path, expiresAt: null };
    }
    const expiresIn = 60 * 60;
    const { data: signed, error: signedError } = await supabaseAdmin.storage
      .from("company-assets")
      .createSignedUrl(path, expiresIn);
    if (signedError) throw new Error(formatSupabaseError(signedError));
    return {
      path,
      signedUrl: signed?.signedUrl ?? null,
      expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
    };
  });

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

export const requestPartnerTenantSuspension = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    tenantId: z.string().uuid(),
    reason: z.string().trim().min(3).max(500),
  }))
  .handler(async ({ context, data }) => {
    await requirePartnerMembership(context.supabase, context.userId);
    const { data: requestId, error } = await (context.supabase as any).rpc(
      "request_tenant_suspension",
      {
        requested_tenant_id: data.tenantId,
        requested_actor_id: context.userId,
        requested_reason: data.reason,
      },
    );
    if (error) throw new Error(formatSupabaseError(error));
    return { requestId: requestId as string };
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
      .select("id, tenant_id, status")
      .eq("id", context.userId)
      .maybeSingle();
    if (profileError) throw new Error(formatSupabaseError(profileError));

    if (profile?.tenant_id && profile.status === "pending") return "/demande-en-attente";
    return profile?.tenant_id ? "/app" : "/403";
  });

export const getPartnerDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PartnerDashboard> => {
    const partnerId = await requirePartnerMembership(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [partnerExpiry, tenantExpiry] = await Promise.all([
      supabaseAdmin.rpc("expire_partner_trials"),
      supabaseAdmin.rpc("expire_due_subscriptions"),
    ]);
    if (partnerExpiry.error) throw new Error(formatSupabaseError(partnerExpiry.error));
    if (tenantExpiry.error) throw new Error(formatSupabaseError(tenantExpiry.error));

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
      partnerSubscriptionResult,
      offersResult,
      paymentsResult,
      creditsResult,
      creditBalanceResult,
      trialsResult,
      offerPacksResult,
      modulePackItemsResult,
      activityProfilesResult,
    ] = await Promise.all([
      context.supabase.from("partners").select("id, name, code").eq("id", partnerId).single(),
      context.supabase.from("partner_tenants").select("tenant_id, assigned_at"),
      (context.supabase as any).from("tenants").select("id, name, slug, logo_url, deleted_at").is("deleted_at", null),
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
      context.supabase
        .from("partner_subscriptions")
        .select("*")
        .eq("partner_id", partnerId)
        .eq("status", "active")
        .maybeSingle(),
      context.supabase.from("partner_offers").select("*"),
      context.supabase.from("partner_payments").select("*").order("created_at", { ascending: false }).limit(100),
      context.supabase.from("partner_credit_transactions").select("*").order("created_at", { ascending: false }).limit(200),
      context.supabase.from("partner_credit_transactions").select("credits"),
      (context.supabase as any).from("partner_trial_usage").select("*").order("created_at", { ascending: false }).limit(100),
      context.supabase.from("module_packs").select("id, name"),
      context.supabase.from("module_pack_items").select("pack_id, module_id"),
      (context.supabase as any)
        .from("trial_activity_profiles")
        .select("code, name, description")
        .eq("is_active", true)
        .order("sort_order"),
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
      partnerSubscriptionResult,
      offersResult,
      paymentsResult,
      creditsResult,
      creditBalanceResult,
      trialsResult,
      offerPacksResult,
      modulePackItemsResult,
      activityProfilesResult,
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

    const tenants = (await Promise.all(((tenantsResult.data ?? []) as Array<{
      id: string;
      name: string;
      slug: string;
      logo_url: string | null;
      deleted_at: string | null;
    }>)
      .filter((tenant) => assignedAt.has(tenant.id))
      .map(async (tenant): Promise<PartnerTenant> => {
        const subscription = subscriptions.get(tenant.id);
        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          loginUrl: `/login/${tenant.slug}`,
          logoPath: tenant.logo_url,
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
      })))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));

    const { error: logError } = await context.supabase.from("partner_activity_logs").insert({
      partner_id: partnerId,
      user_id: context.userId,
      action: "portal.view",
      metadata: { tenant_count: tenants.length },
    });
    if (logError) throw new Error(formatSupabaseError(logError));

    const commercialSubscription = partnerSubscriptionResult.data;
    const offer = (offersResult.data ?? []).find((item) => item.id === commercialSubscription?.offer_id);
    const offerPack = (offerPacksResult.data ?? []).find((pack) => pack.id === offer?.module_pack_id);
    const creditTransactions = creditsResult.data ?? [];
    const trialRows = (trialsResult.data ?? []) as any[];
    const convertedTrials = trialRows.filter((trial) => trial.status === "converted").length;
    const tenantById = new Map(tenants.map((tenant) => [tenant.id, tenant]));

    return {
      partner: {
        id: partnerResult.data!.id,
        name: partnerResult.data!.name,
        code: partnerResult.data!.code,
        creditBalance: (creditBalanceResult.data ?? [])
          .reduce((balance, transaction) => balance + transaction.credits, 0),
      },
      subscription: commercialSubscription && offer ? {
        status: commercialSubscription.status,
        startsAt: commercialSubscription.starts_at,
        expiresAt: commercialSubscription.expires_at,
        offer: {
          id: offer.id,
          name: offer.name,
          price: Number(offer.price),
          includedTenantCredits: offer.included_tenant_credits,
          durationDays: offer.subscription_duration_days,
          maxTrials: offer.max_trials,
          trialDays: offer.trial_duration_days,
          packName: offerPack?.name ?? "Pack indisponible",
        },
      } : null,
      totals: {
        credited: creditTransactions
          .filter((item) => ["payment_credit", "purchase_credit"].includes(item.transaction_type))
          .reduce((sum, item) => sum + item.credits, 0),
        consumed: Math.abs(creditTransactions
          .filter((item) => item.transaction_type === "tenant_debit")
          .reduce((sum, item) => sum + item.credits, 0)),
        activeTenants: tenants.filter((tenant) => tenant.subscription?.status === "active").length,
        trialsCreated: trialRows.length,
        activeTrials: trialRows.filter((trial) => trial.status === "active").length,
        convertedTrials,
        conversionRate: trialRows.length ? (convertedTrials / trialRows.length) * 100 : 0,
        commissionsGenerated: trialRows.reduce(
          (sum, trial) => sum + Number(trial.commission_amount ?? 0),
          0,
        ),
      },
      availableModules: (modulesResult.data ?? [])
        .filter((module) =>
          (modulePackItemsResult.data ?? []).some(
            (item) =>
              item.pack_id === offer?.module_pack_id &&
              item.module_id === module.id,
          ),
        )
        .map(({ id, code, name }) => ({ id, code, name })),
      activityProfiles: (activityProfilesResult.data ?? []).map((profile: any) => ({
        code: profile.code,
        name: profile.name,
        description: profile.description,
      })),
      payments: (paymentsResult.data ?? []).map((payment) => ({
        id: payment.id, amount: Number(payment.amount), currency: payment.currency,
        reference: payment.external_reference, status: payment.status, createdAt: payment.created_at,
      })),
      creditTransactions: creditTransactions.map((transaction) => ({
        id: transaction.id, tenantId: transaction.tenant_id, type: transaction.transaction_type,
        credits: transaction.credits, balanceAfter: transaction.balance_after,
        reason: transaction.reason, reference: transaction.reference, createdAt: transaction.created_at,
      })),
      trials: trialRows.map((trial) => ({
        id: trial.id,
        tenantId: trial.tenant_id,
        tenantName: tenantById.get(trial.tenant_id)?.name ?? "Tenant",
        tenantSlug: tenantById.get(trial.tenant_id)?.slug ?? "",
        loginUrl: tenantById.get(trial.tenant_id)?.loginUrl ?? null,
        email: trial.client_email,
        managerName: trial.manager_name ?? null,
        sector: trial.business_sector ?? null,
        city: trial.city ?? null,
        status: trial.status,
        startsAt: trial.starts_at,
        expiresAt: trial.expires_at,
        createdAt: trial.created_at,
        commissionAmount: Number(trial.commission_amount ?? 0),
      })),
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

const createPartnerTrialSchema = z.object({
  companyName: z.string().trim().min(2).max(120),
  activityProfileCode: z.string().trim().regex(/^[a-z0-9][a-z0-9_-]{1,49}$/),
  managerName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().max(254),
  city: z.string().trim().min(2).max(100),
});

export const createPartnerTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(createPartnerTrialSchema)
  .handler(async ({ context, data }) => {
    await requirePartnerMembership(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const redirectTo = getPasswordRedirectUrl();
    console.info("[PartnerInvitation] Envoi d'une invitation", { redirectTo });
    const authResult = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { full_name: data.managerName, phone: data.phone },
      redirectTo,
    });

    if (authResult.error || !authResult.data.user) {
      throw new Error(formatSupabaseError(authResult.error ?? new Error("Compte non créé")));
    }

    let tenantCommitted = false;
    try {
      const { data: tenantId, error } = await (supabaseAdmin as any).rpc(
        "create_partner_trial",
        {
          requested_name: data.companyName,
          requested_activity_profile_code: data.activityProfileCode,
          requested_manager_name: data.managerName,
          requested_phone: data.phone,
          requested_email: data.email,
          requested_city: data.city,
          requested_admin_user_id: authResult.data.user.id,
          requested_actor_id: context.userId,
        },
      );
      if (error) throw new Error(formatSupabaseError(error));
      tenantCommitted = true;
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from("tenants")
        .select("slug")
        .eq("id", tenantId as string)
        .single();
      if (tenantError) throw new Error(formatSupabaseError(tenantError));
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
        authResult.data.user.id,
        { user_metadata: { tenant_slug: tenant.slug } },
      );
      if (metadataError) {
        console.warn("[PartnerInvitation] tenant_slug non ajouté aux métadonnées", {
          userId: authResult.data.user.id,
          tenantId,
        });
      }
      return { tenantId: tenantId as string, loginUrl: `/login/${tenant.slug}` };
    } catch (error) {
      if (!tenantCommitted) {
        const { error: rollbackError } =
          await supabaseAdmin.auth.admin.deleteUser(authResult.data.user.id);
        if (rollbackError) {
          console.error("[PartnerTrial] Échec du rollback Auth", rollbackError);
        }
      }
      throw error;
    }
  });

export const createPartnerTenant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(createPartnerTrialSchema)
  .handler(async ({ context, data }) => {
    await requirePartnerMembership(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const redirectTo = getPasswordRedirectUrl();
    console.info("[PartnerInvitation] Envoi d'une invitation", { redirectTo });
    const authResult = await supabaseAdmin.auth.admin.inviteUserByEmail(data.email, {
      data: { full_name: data.managerName, phone: data.phone },
      redirectTo,
    });
    if (authResult.error || !authResult.data.user) {
      throw new Error(formatSupabaseError(authResult.error ?? new Error("Compte non créé")));
    }

    let tenantCommitted = false;
    try {
      const { data: tenantId, error } = await (supabaseAdmin as any).rpc(
        "create_partner_paid_tenant",
        {
          requested_name: data.companyName,
          requested_activity_profile_code: data.activityProfileCode,
          requested_manager_name: data.managerName,
          requested_phone: data.phone,
          requested_email: data.email,
          requested_city: data.city,
          requested_admin_user_id: authResult.data.user.id,
          requested_actor_id: context.userId,
        },
      );
      if (error) throw new Error(formatSupabaseError(error));
      tenantCommitted = true;
      const { data: tenant, error: tenantError } = await supabaseAdmin
        .from("tenants")
        .select("slug")
        .eq("id", tenantId as string)
        .single();
      if (tenantError) throw new Error(formatSupabaseError(tenantError));
      const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
        authResult.data.user.id,
        { user_metadata: { tenant_slug: tenant.slug } },
      );
      if (metadataError) {
        console.warn("[PartnerInvitation] tenant_slug non ajouté aux métadonnées", {
          userId: authResult.data.user.id,
          tenantId,
        });
      }
      return { tenantId: tenantId as string, loginUrl: `/login/${tenant.slug}` };
    } catch (error) {
      if (!tenantCommitted) {
        const { error: rollbackError } =
          await supabaseAdmin.auth.admin.deleteUser(authResult.data.user.id);
        if (rollbackError) console.error("[PartnerTenant] Échec du rollback Auth", rollbackError);
      }
      throw error;
    }
  });

export const resendPartnerTenantInvitation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ tenantId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await requirePartnerMembership(context.supabase, context.userId);
    const { data: assignment, error: assignmentError } = await context.supabase
      .from("partner_tenants")
      .select("tenant_id")
      .eq("tenant_id", data.tenantId)
      .maybeSingle();
    if (assignmentError) throw new Error(formatSupabaseError(assignmentError));
    if (!assignment) throw new Error("Tenant non attribué à ce partenaire.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: admins, error: adminError } = await supabaseAdmin
      .from("profiles")
      .select("id, email, roles!inner(name, tenant_id)")
      .eq("tenant_id", data.tenantId)
      .eq("roles.name", "Administrateur")
      .eq("roles.tenant_id", data.tenantId)
      .limit(1);
    if (adminError) throw new Error(formatSupabaseError(adminError));
    const tenantAdmin = admins?.[0];
    if (!tenantAdmin?.id || !tenantAdmin.email) {
      throw new Error("Administrateur du tenant introuvable.");
    }

    const redirectTo = getPasswordRedirectUrl();
    console.info("[PartnerInvitation] Renvoi d'une invitation non consommée", {
      tenantId: data.tenantId,
      redirectTo,
    });
    await resendExistingAuthInvitation(supabaseAdmin.auth, {
      userId: tenantAdmin.id,
      email: tenantAdmin.email,
      redirectTo,
    });
    return { sent: true, userId: tenantAdmin.id, tenantId: data.tenantId };
  });

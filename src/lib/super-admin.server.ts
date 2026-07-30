import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { formatSupabaseError } from "@/lib/supabase-error";

type TenantRow = {
  id: string; name: string; slug: string; is_active: boolean; created_at: string;
  deleted_at: string | null; deletion_reason: string | null; suspended_at: string | null;
};
type PartnerTenantRow = { partner_id: string; tenant_id: string; assigned_at: string };
type TenantMetricRow = {
  tenant_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};
type SaleRow = TenantMetricRow & { total?: number | string | null };
type ModuleRow = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
};
type TenantModuleRow = { tenant_id: string; module_id: string; enabled: boolean };
type ModulePackRow = {
  id: string;
  name: string;
  code: string;
  description: string | null;
  is_active: boolean;
};
type ModulePackItemRow = { pack_id: string; module_id: string };
type TenantModulePackRow = { tenant_id: string; pack_id: string };
type PartnerOfferRow = {
  id: string; name: string; price: number | string; included_tenant_credits: number;
  subscription_duration_days: number; module_pack_id: string; max_trials: number;
  trial_duration_days: number; is_active: boolean;
};
type CommercialPartnerRow = { id: string; name: string; code: string; is_active: boolean };
type PartnerSubscriptionRow = {
  id: string; partner_id: string; offer_id: string; status: string; starts_at: string; expires_at: string;
};
type PartnerPaymentRow = {
  id: string; partner_id: string; offer_id: string; amount: number | string; currency: string;
  status: string; external_reference: string; reason: string | null; validated_by: string; created_at: string;
};
type CreditTransactionRow = {
  id: string; partner_id: string; tenant_id: string | null; transaction_type: string;
  credits: number; balance_after: number; reason: string; reference: string | null; actor_id: string; created_at: string;
};
type CreditPackRow = {
  id: string; name: string; price: number | string; credit_count: number;
  is_active: boolean; created_at: string;
};
type CreditPurchaseRow = {
  id: string; partner_id: string; credit_pack_id: string; credits: number;
  amount: number | string; currency: string; reference: string; reason: string | null;
  attributed_by: string; created_at: string;
};
type TrialUsageRow = {
  id: string; partner_id: string; tenant_id: string; offer_id: string; client_email: string; status: string;
  starts_at: string; expires_at: string; created_by: string;
};
type AiPlanRow = {
  code: string;
  name: string;
  monthly_request_limit: number | null;
  price: number | string | null;
  enabled: boolean;
};
type AiSubscriptionRow = {
  id: string;
  tenant_id: string;
  plan_code: string;
  status: AiSubscriptionStatus;
  monthly_request_limit: number;
  requests_used: number;
  current_period_start: string;
  current_period_end: string;
  activated_at: string | null;
  expires_at: string | null;
};
type AiUsageRow = {
  id: string;
  tenant_id: string;
  user_id: string;
  tool_name: string | null;
  request_type: string;
  input_tokens: number | null;
  output_tokens: number | null;
  total_tokens: number | null;
  estimated_cost: number | string | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

export type SubscriptionStatus = "trial" | "active" | "expired" | "suspended";
export type SubscriptionBillingCycle = "monthly" | "quarterly" | "yearly";
export type AiSubscriptionStatus = "trial" | "active" | "expired" | "suspended" | "cancelled";

export type SuperAdminAiPlan = {
  code: string;
  name: string;
  monthlyRequestLimit: number | null;
  price: number | null;
  enabled: boolean;
};

export type SuperAdminAiSubscription = {
  id: string;
  planCode: string;
  status: AiSubscriptionStatus;
  monthlyRequestLimit: number;
  requestsUsed: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  activatedAt: string | null;
  expiresAt: string | null;
};

export type SuperAdminAiUsage = {
  id: string;
  userId: string;
  toolName: string | null;
  requestType: string;
  inputTokens: number | null;
  outputTokens: number | null;
  totalTokens: number | null;
  estimatedCost: number | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
};

type SubscriptionRow = {
  id: string;
  tenant_id: string;
  trial_started_at: string | null;
  trial_ends_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  amount: number | string;
  billing_cycle: SubscriptionBillingCycle;
  status: SubscriptionStatus;
};

export type RegistrationPoint = {
  month: string;
  label: string;
  tenants: number;
};

export type SuperAdminTenant = {
  id: string;
  name: string;
  slug: string;
  loginUrl: string;
  status: string;
  createdAt: string | null;
  deletedAt: string | null;
  deletionReason: string | null;
  suspendedAt: string | null;
  partner: { id: string; name: string; code: string } | null;
  partnerOffer: { id: string; name: string } | null;
  users: number;
  sales: number;
  clients: number;
  revenue: number;
  monthlyRevenue: number;
  plan: SubscriptionBillingCycle | null;
  subscriptionId: string | null;
  subscriptionEnd: string | null;
  subscriptionStatus: SubscriptionStatus | null;
  subscriptionAmount: number;
  daysRemaining: number | null;
  lastActivityAt: string | null;
  modules: SuperAdminTenantModule[];
  pack: SuperAdminModulePack | null;
  aiSubscription: SuperAdminAiSubscription | null;
  aiUsageHistory: SuperAdminAiUsage[];
};

export type TenantDeletionJob = {
  id: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  status: "pending" | "running" | "partial" | "failed" | "completed";
  currentStep: string;
  attemptCount: number;
  lastError: { step?: string; message?: string; at?: string } | null;
  createdAt: string;
  completedAt: string | null;
};

export type SuperAdminTenantModule = ModuleRow & { enabled: boolean };
export type SuperAdminModulePack = ModulePackRow & { moduleIds: string[] };
export type SuperAdminPartnerOffer = {
  id: string; name: string; price: number; includedTenantCredits: number; durationDays: number;
  modulePackId: string; maxTrials: number; trialDays: number; isActive: boolean;
};
export type SuperAdminCreditPack = {
  id: string; name: string; price: number; creditCount: number; isActive: boolean;
};

export type SuperAdminDashboard = {
  kpis: { tenants: number; activeTenants: number; users: number; sales: number; revenue: number };
  subscriptions: { active: number; trials: number; expired: number; recurringRevenue: number };
  registrations: RegistrationPoint[];
  aiPlans: SuperAdminAiPlan[];
  modules: ModuleRow[];
  modulePacks: SuperAdminModulePack[];
  tenants: SuperAdminTenant[];
  deletionJobs: TenantDeletionJob[];
  partnerCommerce: {
    offers: SuperAdminPartnerOffer[];
    partners: { id: string; name: string; code: string; isActive: boolean; creditBalance: number }[];
    subscriptions: PartnerSubscriptionRow[];
    payments: PartnerPaymentRow[];
    credits: CreditTransactionRow[];
    creditPacks: SuperAdminCreditPack[];
    creditPurchases: CreditPurchaseRow[];
    trials: TrialUsageRow[];
  };
};

function latestDate(current: string | null, candidate?: string | null) {
  if (!candidate) return current;
  if (!current) return candidate;
  return new Date(candidate).getTime() > new Date(current).getTime() ? candidate : current;
}

function remainingDays(end: string | null) {
  if (!end) return null;
  return Math.max(0, Math.ceil((new Date(end).getTime() - Date.now()) / 86_400_000));
}

async function assertSuperAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(formatSupabaseError(error));
  if (!data) throw new Error("Accès refusé : super administrateur de plateforme requis.");
}

export const getPlatformAdminAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ isPlatformAdmin: boolean }> => {
    const { data, error } = await context.supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(formatSupabaseError(error));
    return { isPlatformAdmin: Boolean(data) };
  });

export const manageTenantLifecycle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    tenantId: z.string().uuid(),
    action: z.enum(["suspend", "reactivate", "soft_delete", "restore"]),
    reason: z.string().trim().min(3).max(500),
    exactName: z.string().max(200).optional(),
    secondConfirmation: z.literal("CONFIRMER LA SUPPRESSION").optional(),
  }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { data: result, error } = await (context.supabase as any).rpc(
      "manage_tenant_lifecycle",
      {
        requested_tenant_id: data.tenantId,
        requested_actor_id: context.userId,
        requested_action: data.action,
        requested_reason: data.reason,
        requested_exact_name: data.exactName ?? null,
        requested_second_confirmation: data.secondConfirmation ?? null,
      },
    );
    if (error) throw new Error(formatSupabaseError(error));
    return result as {
      tenant_id: string;
      partner_id: string | null;
      action: string;
      dependencies: Record<string, number>;
    };
  });

async function fetchRows<T>(
  supabaseAdmin: SupabaseClient,
  table: string,
  columns: string,
): Promise<T[]> {
  const { data, error } = await supabaseAdmin.from(table).select(columns);
  if (error) throw new Error(formatSupabaseError(error));
  return (data ?? []) as T[];
}

function buildRegistrationSeries(tenants: SuperAdminTenant[]): RegistrationPoint[] {
  const formatter = new Intl.DateTimeFormat("fr-FR", { month: "short", year: "2-digit" });
  const now = new Date();
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const next = new Date(date.getFullYear(), date.getMonth() + 1, 1);
    return {
      month: date.toISOString(),
      label: formatter.format(date).replace(".", ""),
      tenants: tenants.filter((tenant) => {
        if (!tenant.createdAt) return false;
        const created = new Date(tenant.createdAt);
        return created >= date && created < next;
      }).length,
    };
  });
}

export const getSuperAdminDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<SuperAdminDashboard> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: expirationError } = await supabaseAdmin.rpc("expire_due_subscriptions");
    if (expirationError) throw new Error(formatSupabaseError(expirationError));

    const [
      tenantRows,
      profileRows,
      saleRows,
      clientRows,
      subscriptionRows,
      moduleRows,
      tenantModuleRows,
      modulePackRows,
      modulePackItemRows,
      tenantModulePackRows,
      aiPlanRows,
      aiSubscriptionRows,
      aiUsageRows,
      partnerOfferRows,
      commercialPartnerRows,
      partnerSubscriptionRows,
      partnerPaymentRows,
      creditTransactionRows,
      creditPackRows,
      creditPurchaseRows,
      trialUsageRows,
      partnerTenantRows,
    ] = await Promise.all([
      fetchRows<TenantRow>(supabaseAdmin, "tenants", "id, name, slug, is_active, created_at, deleted_at, deletion_reason, suspended_at"),
      fetchRows<TenantMetricRow>(supabaseAdmin, "profiles", "tenant_id, created_at, updated_at"),
      fetchRows<SaleRow>(supabaseAdmin, "ventes", "tenant_id, total, created_at, updated_at"),
      fetchRows<TenantMetricRow>(supabaseAdmin, "clients", "tenant_id, created_at, updated_at"),
      fetchRows<SubscriptionRow>(
        supabaseAdmin,
        "subscriptions",
        "id, tenant_id, trial_started_at, trial_ends_at, starts_at, ends_at, amount, billing_cycle, status",
      ),
      fetchRows<ModuleRow>(
        supabaseAdmin,
        "erp_modules",
        "id, code, name, description, sort_order, is_active",
      ),
      fetchRows<TenantModuleRow>(
        supabaseAdmin,
        "tenant_modules",
        "tenant_id, module_id, enabled",
      ),
      fetchRows<ModulePackRow>(
        supabaseAdmin,
        "module_packs",
        "id, name, code, description, is_active",
      ),
      fetchRows<ModulePackItemRow>(supabaseAdmin, "module_pack_items", "pack_id, module_id"),
      fetchRows<TenantModulePackRow>(
        supabaseAdmin,
        "tenant_module_packs",
        "tenant_id, pack_id",
      ),
      fetchRows<AiPlanRow>(
        supabaseAdmin,
        "ai_plans",
        "code, name, monthly_request_limit, price, enabled",
      ),
      fetchRows<AiSubscriptionRow>(
        supabaseAdmin,
        "tenant_ai_subscriptions",
        "id, tenant_id, plan_code, status, monthly_request_limit, requests_used, current_period_start, current_period_end, activated_at, expires_at",
      ),
      fetchRows<AiUsageRow>(
        supabaseAdmin,
        "ai_usage_logs",
        "id, tenant_id, user_id, tool_name, request_type, input_tokens, output_tokens, total_tokens, estimated_cost, status, error_message, created_at",
      ),
      fetchRows<PartnerOfferRow>(supabaseAdmin, "partner_offers", "id, name, price, included_tenant_credits, subscription_duration_days, module_pack_id, max_trials, trial_duration_days, is_active"),
      fetchRows<CommercialPartnerRow>(supabaseAdmin, "partners", "id, name, code, is_active"),
      fetchRows<PartnerSubscriptionRow>(supabaseAdmin, "partner_subscriptions", "id, partner_id, offer_id, status, starts_at, expires_at"),
      fetchRows<PartnerPaymentRow>(supabaseAdmin, "partner_payments", "id, partner_id, offer_id, amount, currency, status, external_reference, reason, validated_by, created_at"),
      fetchRows<CreditTransactionRow>(supabaseAdmin, "partner_credit_transactions", "id, partner_id, tenant_id, transaction_type, credits, balance_after, reason, reference, actor_id, created_at"),
      fetchRows<CreditPackRow>(supabaseAdmin, "partner_credit_packs", "id, name, price, credit_count, is_active, created_at"),
      fetchRows<CreditPurchaseRow>(supabaseAdmin, "partner_credit_purchases", "id, partner_id, credit_pack_id, credits, amount, currency, reference, reason, attributed_by, created_at"),
      fetchRows<TrialUsageRow>(supabaseAdmin, "partner_trial_usage", "id, partner_id, tenant_id, offer_id, client_email, status, starts_at, expires_at, created_by"),
      fetchRows<PartnerTenantRow>(supabaseAdmin, "partner_tenants", "partner_id, tenant_id, assigned_at"),
    ]);
    const subscriptionsByTenant = new Map(
      subscriptionRows.map((subscription) => [subscription.tenant_id, subscription]),
    );
    const aiSubscriptionsByTenant = new Map(
      aiSubscriptionRows.map((subscription) => [subscription.tenant_id, subscription]),
    );
    const aiUsageByTenant = new Map<string, AiUsageRow[]>();
    for (const usage of aiUsageRows) {
      const rows = aiUsageByTenant.get(usage.tenant_id) ?? [];
      rows.push(usage);
      aiUsageByTenant.set(usage.tenant_id, rows);
    }
    const tenantModuleState = new Map(
      tenantModuleRows.map((assignment) => [
        `${assignment.tenant_id}:${assignment.module_id}`,
        assignment.enabled,
      ]),
    );
    const modulePacks = modulePackRows
      .map((pack) => ({
        ...pack,
        moduleIds: modulePackItemRows
          .filter((item) => item.pack_id === pack.id)
          .map((item) => item.module_id),
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const packsById = new Map(modulePacks.map((pack) => [pack.id, pack]));
    const tenantPackState = new Map(
      tenantModulePackRows.map((assignment) => [assignment.tenant_id, assignment.pack_id]),
    );
    const partnersById = new Map(commercialPartnerRows.map((partner) => [partner.id, partner]));
    const creatorPartnerByTenant = new Map(
      [...partnerTenantRows]
        .sort((a, b) => a.assigned_at.localeCompare(b.assigned_at))
        .map((assignment) => [assignment.tenant_id, assignment.partner_id]),
    );
    const offersById = new Map(partnerOfferRows.map((offer) => [offer.id, offer]));
    const trialByTenant = new Map(trialUsageRows.map((trial) => [trial.tenant_id, trial]));
    const partnerSubscriptionByPartner = new Map(
      partnerSubscriptionRows.map((subscription) => [subscription.partner_id, subscription]),
    );
    const metrics = new Map<
      string,
      {
        users: number;
        sales: number;
        clients: number;
        revenue: number;
        monthlyRevenue: number;
        lastActivityAt: string | null;
      }
    >();
    const getMetrics = (tenantId: string) => {
      const existing = metrics.get(tenantId);
      if (existing) return existing;
      const created = {
        users: 0,
        sales: 0,
        clients: 0,
        revenue: 0,
        monthlyRevenue: 0,
        lastActivityAt: null,
      };
      metrics.set(tenantId, created);
      return created;
    };
    const registerRows = (rows: TenantMetricRow[], field: "users" | "clients") => {
      for (const row of rows) {
        if (!row.tenant_id) continue;
        const tenantMetrics = getMetrics(row.tenant_id);
        tenantMetrics[field] += 1;
        tenantMetrics.lastActivityAt = latestDate(
          tenantMetrics.lastActivityAt,
          row.updated_at ?? row.created_at,
        );
      }
    };
    registerRows(profileRows, "users");
    registerRows(clientRows, "clients");

    const currentMonth = new Date();
    for (const sale of saleRows) {
      if (!sale.tenant_id) continue;
      const tenantMetrics = getMetrics(sale.tenant_id);
      const saleTotal = Number(sale.total) || 0;
      tenantMetrics.sales += 1;
      tenantMetrics.revenue += saleTotal;
      if (sale.created_at) {
        const saleDate = new Date(sale.created_at);
        if (
          saleDate.getFullYear() === currentMonth.getFullYear() &&
          saleDate.getMonth() === currentMonth.getMonth()
        ) {
          tenantMetrics.monthlyRevenue += saleTotal;
        }
      }
      tenantMetrics.lastActivityAt = latestDate(
        tenantMetrics.lastActivityAt,
        sale.updated_at ?? sale.created_at,
      );
    }

    const tenants = tenantRows
      .map((tenant): SuperAdminTenant => {
        const tenantMetrics = getMetrics(tenant.id);
        const subscription = subscriptionsByTenant.get(tenant.id);
        const aiSubscription = aiSubscriptionsByTenant.get(tenant.id);
        const subscriptionEnd =
          subscription?.status === "trial"
            ? subscription.trial_ends_at
            : (subscription?.ends_at ?? null);
        return {
          id: tenant.id,
          name: tenant.name,
          slug: tenant.slug,
          loginUrl: `/login/${tenant.slug}`,
          status: tenant.deleted_at
            ? "deleted"
            : !tenant.is_active
              ? "suspended"
              : (subscription?.status ?? "active"),
          createdAt: tenant.created_at,
          deletedAt: tenant.deleted_at,
          deletionReason: tenant.deletion_reason,
          suspendedAt: tenant.suspended_at,
          partner: (() => {
            const partner = partnersById.get(creatorPartnerByTenant.get(tenant.id) ?? "");
            return partner ? { id: partner.id, name: partner.name, code: partner.code } : null;
          })(),
          partnerOffer: (() => {
            const partnerId = creatorPartnerByTenant.get(tenant.id);
            const offerId = trialByTenant.get(tenant.id)?.offer_id
              ?? (partnerId ? partnerSubscriptionByPartner.get(partnerId)?.offer_id : undefined);
            const offer = offerId ? offersById.get(offerId) : undefined;
            return offer ? { id: offer.id, name: offer.name } : null;
          })(),
          ...tenantMetrics,
          plan: subscription?.billing_cycle ?? null,
          subscriptionId: subscription?.id ?? null,
          subscriptionEnd,
          subscriptionStatus: subscription?.status ?? null,
          subscriptionAmount: Number(subscription?.amount) || 0,
          daysRemaining: remainingDays(subscriptionEnd),
          lastActivityAt: latestDate(tenantMetrics.lastActivityAt, tenant.created_at),
          modules: moduleRows
            .filter((module) => module.is_active)
            .map((module) => ({
              ...module,
              enabled: tenantModuleState.get(`${tenant.id}:${module.id}`) ?? false,
            }))
            .sort((a, b) => a.sort_order - b.sort_order),
          pack: packsById.get(tenantPackState.get(tenant.id) ?? "") ?? null,
          aiSubscription: aiSubscription
            ? {
                id: aiSubscription.id,
                planCode: aiSubscription.plan_code,
                status: aiSubscription.status,
                monthlyRequestLimit: aiSubscription.monthly_request_limit,
                requestsUsed: aiSubscription.requests_used,
                currentPeriodStart: aiSubscription.current_period_start,
                currentPeriodEnd: aiSubscription.current_period_end,
                activatedAt: aiSubscription.activated_at,
                expiresAt: aiSubscription.expires_at,
              }
            : null,
          aiUsageHistory: (aiUsageByTenant.get(tenant.id) ?? [])
            .sort((a, b) => b.created_at.localeCompare(a.created_at))
            .slice(0, 50)
            .map((usage) => ({
              id: usage.id,
              userId: usage.user_id,
              toolName: usage.tool_name,
              requestType: usage.request_type,
              inputTokens: usage.input_tokens,
              outputTokens: usage.output_tokens,
              totalTokens: usage.total_tokens,
              estimatedCost:
                usage.estimated_cost === null ? null : Number(usage.estimated_cost),
              status: usage.status,
              errorMessage: usage.error_message,
              createdAt: usage.created_at,
            })),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const tenantSales = saleRows.filter((sale) => sale.tenant_id);

    const { data: deletionRows, error: deletionError } = await (supabaseAdmin as any)
      .from("tenant_deletion_jobs")
      .select("id, tenant_id, tenant_slug, tenant_name, status, current_step, attempt_count, last_error, created_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(50);
    if (deletionError) throw new Error(formatSupabaseError(deletionError));

    return {
      kpis: {
        tenants: tenants.length,
        activeTenants: tenants.filter((tenant) =>
          ["active", "trial"].includes(tenant.subscriptionStatus ?? ""),
        ).length,
        users: profileRows.filter((profile) => profile.tenant_id).length,
        sales: tenantSales.length,
        revenue: tenantSales.reduce((sum, sale) => sum + (Number(sale.total) || 0), 0),
      },
      subscriptions: {
        active: subscriptionRows.filter((subscription) => subscription.status === "active").length,
        trials: subscriptionRows.filter((subscription) => subscription.status === "trial").length,
        expired: subscriptionRows.filter((subscription) => subscription.status === "expired")
          .length,
        recurringRevenue: subscriptionRows
          .filter((subscription) => subscription.status === "active")
          .reduce((total, subscription) => {
            const divisor =
              subscription.billing_cycle === "yearly"
                ? 12
                : subscription.billing_cycle === "quarterly"
                  ? 3
                  : 1;
            return total + (Number(subscription.amount) || 0) / divisor;
          }, 0),
      },
      registrations: buildRegistrationSeries(tenants),
      aiPlans: aiPlanRows.map((plan) => ({
        code: plan.code,
        name: plan.name,
        monthlyRequestLimit: plan.monthly_request_limit,
        price: plan.price === null ? null : Number(plan.price),
        enabled: plan.enabled,
      })),
      modules: moduleRows.sort((a, b) => a.sort_order - b.sort_order),
      modulePacks,
      tenants,
      deletionJobs: (deletionRows ?? []).map((job: any) => ({
        id: job.id,
        tenantId: job.tenant_id,
        tenantSlug: job.tenant_slug,
        tenantName: job.tenant_name,
        status: job.status,
        currentStep: job.current_step,
        attemptCount: job.attempt_count,
        lastError: job.last_error,
        createdAt: job.created_at,
        completedAt: job.completed_at,
      })),
      partnerCommerce: {
        offers: partnerOfferRows.map((offer) => ({
          id: offer.id, name: offer.name, price: Number(offer.price),
          includedTenantCredits: offer.included_tenant_credits,
          durationDays: offer.subscription_duration_days, modulePackId: offer.module_pack_id,
          maxTrials: offer.max_trials, trialDays: offer.trial_duration_days, isActive: offer.is_active,
        })),
        partners: commercialPartnerRows.map((partner) => ({
          id: partner.id, name: partner.name, code: partner.code,
          isActive: partner.is_active,
          creditBalance: creditTransactionRows
            .filter((transaction) => transaction.partner_id === partner.id)
            .reduce((balance, transaction) => balance + transaction.credits, 0),
        })),
        subscriptions: partnerSubscriptionRows,
        payments: partnerPaymentRows,
        credits: creditTransactionRows,
        creditPacks: creditPackRows.map((pack) => ({
          id: pack.id, name: pack.name, price: Number(pack.price),
          creditCount: pack.credit_count, isActive: pack.is_active,
        })),
        creditPurchases: creditPurchaseRows,
        trials: trialUsageRows,
      },
    };
  });

const modulePackSchema = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(100),
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{1,49}$/),
  description: z.string().trim().max(500).nullable(),
  isActive: z.boolean(),
  moduleIds: z.array(z.string().uuid()).max(100),
});

export const saveModulePack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(modulePackSchema)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: packId, error } = await supabaseAdmin.rpc("manage_module_pack", {
      requested_pack_id: data.id as string,
      requested_name: data.name,
      requested_code: data.code,
      requested_description: data.description ?? "",
      requested_is_active: data.isActive,
      requested_module_ids: [...new Set(data.moduleIds)],
    });
    if (error) throw new Error(formatSupabaseError(error));
    return { success: true, packId: packId as string };
  });

export const removeModulePack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ packId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("delete_module_pack", {
      requested_pack_id: data.packId,
    });
    if (error) throw new Error(formatSupabaseError(error));
    return { success: true };
  });

const partnerOfferSchema = z.object({
  id: z.string().uuid().nullable(),
  name: z.string().trim().min(1).max(120),
  price: z.number().finite().nonnegative(),
  includedTenantCredits: z.number().int().nonnegative(),
  durationDays: z.number().int().positive().max(3650),
  modulePackId: z.string().uuid(),
  maxTrials: z.number().int().nonnegative().max(100000),
  trialDays: z.number().int().nonnegative().max(365),
  isActive: z.boolean(),
});

export const savePartnerOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(partnerOfferSchema)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: offerId, error } = await supabaseAdmin.rpc("manage_partner_offer", {
      requested_offer_id: data.id as string,
      requested_name: data.name,
      requested_price: data.price,
      requested_credits: data.includedTenantCredits,
      requested_duration_days: data.durationDays,
      requested_pack_id: data.modulePackId,
      requested_max_trials: data.maxTrials,
      requested_trial_days: data.trialDays,
      requested_is_active: data.isActive,
      requested_actor_id: context.userId,
    });
    if (error) throw new Error(formatSupabaseError(error));
    return { offerId: offerId as string };
  });

export const removePartnerOffer = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ offerId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("delete_partner_offer", {
      requested_offer_id: data.offerId,
      requested_actor_id: context.userId,
    });
    if (error) throw new Error(formatSupabaseError(error));
    return { success: true };
  });

export const validatePartnerPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    partnerId: z.string().uuid(), offerId: z.string().uuid(),
    amount: z.number().finite().nonnegative(), currency: z.string().trim().length(3),
    reference: z.string().trim().min(1).max(160), reason: z.string().trim().max(500),
  }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: paymentId, error } = await supabaseAdmin.rpc("validate_partner_payment", {
      requested_partner_id: data.partnerId, requested_offer_id: data.offerId,
      requested_amount: data.amount, requested_currency: data.currency.toUpperCase(),
      requested_reference: data.reference, requested_reason: data.reason,
      requested_actor_id: context.userId,
    });
    if (error) throw new Error(formatSupabaseError(error));
    return { paymentId: paymentId as string };
  });

export const adjustPartnerCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    partnerId: z.string().uuid(), credits: z.number().int().refine((value) => value !== 0),
    reason: z.string().trim().min(1).max(500), reference: z.string().trim().max(160),
  }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: balance, error } = await supabaseAdmin.rpc("adjust_partner_credits", {
      requested_partner_id: data.partnerId, requested_credits: data.credits,
      requested_reason: data.reason, requested_reference: data.reference,
      requested_actor_id: context.userId,
    });
    if (error) throw new Error(formatSupabaseError(error));
    return { balance: balance as number };
  });

export const savePartnerCreditPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    id: z.string().uuid().nullable(),
    name: z.string().trim().min(1).max(120),
    price: z.number().finite().nonnegative(),
    creditCount: z.number().int().positive().max(1_000_000),
    isActive: z.boolean(),
  }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: packId, error } = await (supabaseAdmin as any).rpc(
      "manage_partner_credit_pack",
      {
        requested_pack_id: data.id,
        requested_name: data.name,
        requested_price: data.price,
        requested_credit_count: data.creditCount,
        requested_is_active: data.isActive,
        requested_actor_id: context.userId,
      },
    );
    if (error) throw new Error(formatSupabaseError(error));
    return { packId: packId as string };
  });

export const purchasePartnerCreditPack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    partnerId: z.string().uuid(),
    packId: z.string().uuid(),
    reference: z.string().trim().min(1).max(160),
    reason: z.string().trim().max(500),
  }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: purchaseId, error } = await (supabaseAdmin as any).rpc(
      "purchase_partner_credit_pack",
      {
        requested_partner_id: data.partnerId,
        requested_pack_id: data.packId,
        requested_reference: data.reference,
        requested_reason: data.reason,
        requested_actor_id: context.userId,
      },
    );
    if (error) throw new Error(formatSupabaseError(error));
    return { purchaseId: purchaseId as string };
  });

export const assignModulePack = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ tenantId: z.string().uuid(), packId: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("assign_module_pack_to_tenant", {
      requested_tenant_id: data.tenantId,
      requested_pack_id: data.packId,
      requested_by: context.userId,
    });
    if (error) throw new Error(formatSupabaseError(error));
    return { success: true };
  });

const manageTenantModuleSchema = z.object({
  tenantId: z.string().uuid(),
  moduleId: z.string().uuid(),
  enabled: z.boolean(),
});

export const manageTenantModule = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(manageTenantModuleSchema)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("tenant_modules").upsert(
      {
        tenant_id: data.tenantId,
        module_id: data.moduleId,
        enabled: data.enabled,
      },
      { onConflict: "tenant_id,module_id" },
    );
    if (error) throw new Error(formatSupabaseError(error));
    return { success: true };
  });

const manageSubscriptionSchema = z.object({
  tenantId: z.string().uuid(),
  action: z.enum(["activate", "extend", "suspend", "renew"]),
  amount: z.number().finite().nonnegative().optional(),
  billingCycle: z.enum(["monthly", "quarterly", "yearly"]).optional(),
  days: z.number().int().min(1).max(3650).optional(),
});

function cycleDays(cycle: SubscriptionBillingCycle) {
  if (cycle === "yearly") return 365;
  if (cycle === "quarterly") return 90;
  return 30;
}

export const manageTenantSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(manageSubscriptionSchema)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: current, error: currentError } = await supabaseAdmin
      .from("subscriptions")
      .select(
        "id, tenant_id, trial_started_at, trial_ends_at, starts_at, ends_at, amount, billing_cycle, status",
      )
      .eq("tenant_id", data.tenantId)
      .single();
    if (currentError) throw new Error(formatSupabaseError(currentError));
    const subscription = current as SubscriptionRow;
    const now = new Date();
    const billingCycle = data.billingCycle ?? subscription.billing_cycle;
    const durationDays = data.days ?? cycleDays(billingCycle);
    let update: TablesUpdate<"subscriptions">;

    if (data.action === "suspend") {
      update = { status: "suspended" };
    } else if (data.action === "extend" && subscription.status === "trial") {
      const base = Math.max(now.getTime(), new Date(subscription.trial_ends_at ?? now).getTime());
      update = {
        status: "trial",
        trial_ends_at: new Date(base + durationDays * 86_400_000).toISOString(),
      };
    } else if (data.action === "extend") {
      const base = Math.max(now.getTime(), new Date(subscription.ends_at ?? now).getTime());
      update = {
        status: "active",
        ends_at: new Date(base + durationDays * 86_400_000).toISOString(),
      };
    } else {
      update = {
        status: "active",
        starts_at: now.toISOString(),
        ends_at: new Date(now.getTime() + durationDays * 86_400_000).toISOString(),
        amount: data.amount ?? Number(subscription.amount),
        billing_cycle: billingCycle,
      };
    }

    const { error: updateError } = await supabaseAdmin
      .from("subscriptions")
      .update(update)
      .eq("id", subscription.id);
    if (updateError) throw new Error(formatSupabaseError(updateError));
    return { success: true };
  });

const manageAiSubscriptionSchema = z.object({
  tenantId: z.string().uuid(),
  action: z.enum(["activate", "suspend", "renew", "extend", "cancel", "update"]),
  activationStatus: z.enum(["active", "trial"]).optional(),
  planCode: z.string().trim().min(1).optional(),
  monthlyRequestLimit: z.number().int().positive().optional(),
  days: z.number().int().min(1).max(3650).optional(),
});

export const manageTenantAiSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(manageAiSubscriptionSchema)
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: existingError } = await (supabaseAdmin as any)
      .from("tenant_ai_subscriptions")
      .select("*")
      .eq("tenant_id", data.tenantId)
      .maybeSingle();
    if (existingError) throw new Error(formatSupabaseError(existingError));

    if (!existing && !["activate"].includes(data.action)) {
      throw new Error("Aucun abonnement Assistant IA à modifier pour ce tenant.");
    }

    const now = new Date();
    const current = existing as AiSubscriptionRow | null;
    const planCode = data.planCode ?? current?.plan_code;
    const monthlyRequestLimit = data.monthlyRequestLimit ?? current?.monthly_request_limit;
    if (!planCode || !monthlyRequestLimit) {
      throw new Error("Le plan et un quota mensuel positif sont obligatoires.");
    }
    const { data: plan, error: planError } = await (supabaseAdmin as any)
      .from("ai_plans")
      .select("code")
      .eq("code", planCode)
      .single();
    if (planError || !plan) throw new Error("Plan Assistant IA inconnu.");

    const days = data.days ?? 30;
    const update: Record<string, unknown> = {
      plan_code: planCode,
      monthly_request_limit: monthlyRequestLimit,
    };

    if (data.action === "suspend") {
      update.status = "suspended";
    } else if (data.action === "cancel") {
      update.status = "cancelled";
    } else if (data.action === "extend") {
      const base = Math.max(now.getTime(), new Date(current?.expires_at ?? now).getTime());
      update.expires_at = new Date(base + days * 86_400_000).toISOString();
    } else if (data.action === "activate" || data.action === "renew") {
      const periodEnd = new Date(now);
      periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
      update.status = data.action === "activate" ? (data.activationStatus ?? "active") : "active";
      update.activated_at = current?.activated_at ?? now.toISOString();
      update.expires_at = new Date(now.getTime() + days * 86_400_000).toISOString();
      update.current_period_start = now.toISOString();
      update.current_period_end = periodEnd.toISOString();
      update.requests_used = 0;
    }

    if (current) {
      const { error } = await (supabaseAdmin as any)
        .from("tenant_ai_subscriptions")
        .update(update)
        .eq("id", current.id);
      if (error) throw new Error(formatSupabaseError(error));
    } else {
      const { error } = await (supabaseAdmin as any)
        .from("tenant_ai_subscriptions")
        .insert({
          tenant_id: data.tenantId,
          ...update,
        });
      if (error) throw new Error(formatSupabaseError(error));
    }
    return { success: true };
  });

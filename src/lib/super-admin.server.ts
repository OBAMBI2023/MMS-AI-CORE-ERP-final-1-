import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { TablesUpdate } from "@/integrations/supabase/types";
import { formatSupabaseError } from "@/lib/supabase-error";

type TenantRow = { id: string; name: string; is_active: boolean; created_at: string };
type TenantMetricRow = {
  tenant_id: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};
type SaleRow = TenantMetricRow & { total?: number | string | null };

export type SubscriptionStatus = "trial" | "active" | "expired" | "suspended";
export type SubscriptionBillingCycle = "monthly" | "quarterly" | "yearly";

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
  status: string;
  createdAt: string | null;
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
};

export type SuperAdminDashboard = {
  kpis: { tenants: number; activeTenants: number; users: number; sales: number; revenue: number };
  subscriptions: { active: number; trials: number; expired: number; recurringRevenue: number };
  registrations: RegistrationPoint[];
  tenants: SuperAdminTenant[];
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

    const [tenantRows, profileRows, saleRows, clientRows, subscriptionRows] = await Promise.all([
      fetchRows<TenantRow>(supabaseAdmin, "tenants", "id, name, is_active, created_at"),
      fetchRows<TenantMetricRow>(supabaseAdmin, "profiles", "tenant_id, created_at, updated_at"),
      fetchRows<SaleRow>(supabaseAdmin, "ventes", "tenant_id, total, created_at, updated_at"),
      fetchRows<TenantMetricRow>(supabaseAdmin, "clients", "tenant_id, created_at, updated_at"),
      fetchRows<SubscriptionRow>(
        supabaseAdmin,
        "subscriptions",
        "id, tenant_id, trial_started_at, trial_ends_at, starts_at, ends_at, amount, billing_cycle, status",
      ),
    ]);
    const subscriptionsByTenant = new Map(
      subscriptionRows.map((subscription) => [subscription.tenant_id, subscription]),
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
        const subscriptionEnd =
          subscription?.status === "trial"
            ? subscription.trial_ends_at
            : (subscription?.ends_at ?? null);
        return {
          id: tenant.id,
          name: tenant.name,
          status: subscription?.status ?? (tenant.is_active ? "active" : "suspended"),
          createdAt: tenant.created_at,
          ...tenantMetrics,
          plan: subscription?.billing_cycle ?? null,
          subscriptionId: subscription?.id ?? null,
          subscriptionEnd,
          subscriptionStatus: subscription?.status ?? null,
          subscriptionAmount: Number(subscription?.amount) || 0,
          daysRemaining: remainingDays(subscriptionEnd),
          lastActivityAt: latestDate(tenantMetrics.lastActivityAt, tenant.created_at),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "fr"));
    const tenantSales = saleRows.filter((sale) => sale.tenant_id);

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
      tenants,
    };
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

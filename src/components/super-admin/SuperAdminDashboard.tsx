import { useMemo, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { SuperAdminSidebar } from "@/components/super-admin/SuperAdminSidebar";
import { SuperAdminHeader } from "@/components/super-admin/SuperAdminHeader";
import { SuperAdminKpis } from "@/components/super-admin/SuperAdminKpis";
import { SuperAdminCharts } from "@/components/super-admin/SuperAdminCharts";
import { ModulesCatalogSection } from "@/components/super-admin/ModulesCatalogSection";
import { ModulePacksSection } from "@/components/super-admin/ModulePacksSection";
import { TenantModuleControlPanel } from "@/components/super-admin/TenantModuleControlPanel";
import { TenantTable } from "@/components/super-admin/TenantTable";
import { PartnerOffersSection } from "@/components/super-admin/PartnerOffersSection";
import { SubscriptionSummary } from "@/components/super-admin/SubscriptionSummary";
import { ActivityFeed } from "@/components/super-admin/ActivityFeed";
import { SuperAdminSettingsSection } from "@/components/super-admin/SuperAdminSettingsSection";
import type { SuperAdminDashboard, SuperAdminTenant } from "@/lib/super-admin.server";

const emptyDashboard: SuperAdminDashboard = {
  kpis: { tenants: 0, activeTenants: 0, users: 0, sales: 0, revenue: 0 },
  subscriptions: { active: 0, trials: 0, expired: 0, recurringRevenue: 0 },
  registrations: [],
  aiPlans: [],
  modules: [],
  modulePacks: [],
  tenants: [],
  deletionJobs: [],
  partnerCommerce: {
    offers: [],
    partners: [],
    subscriptions: [],
    payments: [],
    credits: [],
    creditPacks: [],
    creditPurchases: [],
    trials: [],
  },
};

function normalizeDashboardData(
  value: SuperAdminDashboard | null | undefined,
): SuperAdminDashboard {
  if (!value || typeof value !== "object") return emptyDashboard;

  const kpis = value.kpis ?? emptyDashboard.kpis;
  const subscriptions = value.subscriptions ?? emptyDashboard.subscriptions;
  const commerce = value.partnerCommerce ?? emptyDashboard.partnerCommerce;
  const safeNumber = (candidate: unknown) =>
    typeof candidate === "number" && Number.isFinite(candidate) ? candidate : 0;
  const safeArray = <T,>(candidate: T[] | null | undefined): T[] =>
    Array.isArray(candidate) ? candidate.filter(Boolean) : [];

  return {
    kpis: {
      tenants: safeNumber(kpis.tenants),
      activeTenants: safeNumber(kpis.activeTenants),
      users: safeNumber(kpis.users),
      sales: safeNumber(kpis.sales),
      revenue: safeNumber(kpis.revenue),
    },
    subscriptions: {
      active: safeNumber(subscriptions.active),
      trials: safeNumber(subscriptions.trials),
      expired: safeNumber(subscriptions.expired),
      recurringRevenue: safeNumber(subscriptions.recurringRevenue),
    },
    registrations: safeArray(value.registrations),
    aiPlans: safeArray(value.aiPlans),
    modules: safeArray(value.modules),
    modulePacks: safeArray(value.modulePacks).map((pack) => ({
      ...pack,
      moduleIds: safeArray(pack?.moduleIds),
    })),
    tenants: safeArray(value.tenants).map((tenant) => ({
      ...tenant,
      id: tenant?.id ?? "",
      name: tenant?.name ?? "Tenant sans nom",
      status: tenant?.status ?? "suspended",
      loginUrl: tenant?.loginUrl ?? "#",
      users: safeNumber(tenant?.users),
      sales: safeNumber(tenant?.sales),
      clients: safeNumber(tenant?.clients),
      revenue: safeNumber(tenant?.revenue),
      monthlyRevenue: safeNumber(tenant?.monthlyRevenue),
      subscriptionAmount: safeNumber(tenant?.subscriptionAmount),
      modules: safeArray(tenant?.modules),
      aiUsageHistory: safeArray(tenant?.aiUsageHistory),
    })),
    deletionJobs: safeArray(value.deletionJobs),
    partnerCommerce: {
      offers: safeArray(commerce.offers),
      partners: safeArray(commerce.partners),
      subscriptions: safeArray(commerce.subscriptions),
      payments: safeArray(commerce.payments),
      credits: safeArray(commerce.credits),
      creditPacks: safeArray(commerce.creditPacks),
      creditPurchases: safeArray(commerce.creditPurchases),
      trials: safeArray(commerce.trials),
    },
  };
}

export function SuperAdminDashboardView({
  data,
  onSignOut,
}: {
  data: SuperAdminDashboard;
  onSignOut: () => Promise<void>;
}) {
  const [tenantQuery, setTenantQuery] = useState("");
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const dashboard = useMemo(() => normalizeDashboardData(data), [data]);

  const handleManageModules = (tenant: SuperAdminTenant) => {
    setSelectedTenantId(tenant.id);
    document
      .getElementById("controle-modules")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-muted/30 text-foreground dark:bg-background">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] lg:block">
        <SuperAdminSidebar />
      </aside>

      <div className="lg:pl-[248px]">
        <SuperAdminHeader
          query={tenantQuery}
          onQueryChange={setTenantQuery}
          onSignOut={onSignOut}
        />

        <main id="dashboard" className="space-y-7 p-4 sm:p-6 xl:p-8">
          <SuperAdminKpis kpis={dashboard.kpis} />
          <SuperAdminCharts dashboard={dashboard} />

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
            <div className="min-w-0 space-y-7">
              <ModulesCatalogSection modules={dashboard.modules} />
              <ModulePacksSection packs={dashboard.modulePacks} modules={dashboard.modules} />
              <PartnerOffersSection
                commerce={dashboard.partnerCommerce}
                packs={dashboard.modulePacks}
              />
              <TenantTable
                tenants={dashboard.tenants}
                deletionJobs={dashboard.deletionJobs}
                aiPlans={dashboard.aiPlans}
                query={tenantQuery}
                onQueryChange={setTenantQuery}
                onManageModules={handleManageModules}
              />
              <SubscriptionSummary data={dashboard.subscriptions} />
              <ActivityFeed />
              <SuperAdminSettingsSection />
            </div>

            <div className="xl:sticky xl:top-24">
              <TenantModuleControlPanel
                tenants={dashboard.tenants}
                modulePacks={dashboard.modulePacks}
                selectedTenantId={selectedTenantId}
                onSelectedTenantIdChange={setSelectedTenantId}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function SuperAdminDashboardSkeleton() {
  return (
    <div className="min-h-screen bg-muted/30 lg:pl-[248px] dark:bg-background">
      <div className="fixed inset-y-0 left-0 hidden w-[248px] bg-[#070d1f] lg:block" />
      <div className="h-[72px] border-b border-border bg-background" />
      <main className="space-y-7 p-4 sm:p-6 xl:p-8">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, index) => (
            <Skeleton key={index} className="h-36 rounded-xl" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-12">
          <Skeleton className="h-80 rounded-xl xl:col-span-6" />
          <Skeleton className="h-80 rounded-xl xl:col-span-3" />
          <Skeleton className="h-80 rounded-xl xl:col-span-3" />
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Skeleton className="h-96 rounded-xl" />
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </main>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Building2,
  Component,
  FileText,
  FileSignature,
  KeyRound,
  Landmark,
  Loader2,
  Save,
  Users as UsersIcon,
} from "lucide-react";

import { AppShell } from "@/components/mms/AppShell";
import { CompanyPreviewCard } from "@/components/settings/CompanyPreviewCard";
import { ConfigurationProgress } from "@/components/settings/ConfigurationProgress";
import { QuickActions } from "@/components/settings/QuickActions";
import { BillingTab } from "@/components/settings/tabs/BillingTab";
import { CatalogTab } from "@/components/settings/tabs/CatalogTab";
import { DocumentsTab } from "@/components/settings/tabs/DocumentsTab";
import { GeneralTab } from "@/components/settings/tabs/GeneralTab";
import { LegalTab } from "@/components/settings/tabs/LegalTab";
import { SecurityTab } from "@/components/settings/tabs/SecurityTab";
import { UsersTab } from "@/components/settings/tabs/UsersTab";
import { Button } from "@/components/ui/button";
import { PLATFORM_BRANDING } from "@/config/branding";
import { useParametresEditor } from "@/hooks/use-parametres-editor";
import { useTenantModules } from "@/hooks/use-tenant-modules";
import { getVisibleSettingsTabs, type SettingsTabId } from "@/lib/settings-tabs";

export const Route = createFileRoute("/parametres")({
  component: ParametresPage,
  head: () => ({
    meta: [
      { title: `Paramètres — ${PLATFORM_BRANDING.productName}` },
      {
        name: "description",
        content: "Gérez les informations, la facturation et la sécurité de votre entreprise.",
      },
    ],
  }),
});

const TAB_META: Record<SettingsTabId, { label: string; icon: typeof Building2 }> = {
  general: { label: "Général", icon: Building2 },
  legal: { label: "Légal", icon: FileText },
  catalog: { label: "Catalogue", icon: Component },
  users: { label: "Utilisateurs", icon: UsersIcon },
  billing: { label: "Facturation", icon: Landmark },
  documents: { label: "Documents", icon: FileSignature },
  security: { label: "Sécurité", icon: KeyRound },
};

// Tabs backed by the shared `parametres` form and the top-level Enregistrer action.
const FORM_TABS = new Set<SettingsTabId>(["general", "legal", "billing", "documents"]);

function formatError(error: unknown) {
  const value = error as { message?: string };
  return value?.message || "Une erreur inattendue est survenue.";
}

function ParametresPage() {
  const [tab, setTab] = useState<SettingsTabId>("general");
  const editor = useParametresEditor();
  const modulesQuery = useTenantModules();
  const catalogModuleActive = Boolean(modulesQuery.data?.has("products_services"));
  const visibleTabs = getVisibleSettingsTabs({ catalogModuleActive });

  const activeTab = visibleTabs.includes(tab) ? tab : visibleTabs[0];
  const loading = editor.loading || modulesQuery.isLoading;

  return (
    <AppShell
      title="Paramètres"
      subtitle="Gérez les informations, la facturation et la sécurité de votre entreprise"
      actions={
        FORM_TABS.has(activeTab) && editor.form ? (
          <Button
            className="gap-2"
            disabled={editor.isSaving || !editor.isDirty || !editor.form.company_name.trim()}
            onClick={() => void editor.save()}
          >
            {editor.isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Enregistrer
          </Button>
        ) : undefined
      }
    >
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex items-center gap-2 overflow-x-auto rounded-xl border bg-card p-1.5 shadow-sm">
          {visibleTabs.map((id) => {
            const meta = TAB_META[id];
            const Icon = meta.icon;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors ${
                  activeTab === id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {meta.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="flex min-h-64 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Chargement des paramètres…
          </div>
        ) : editor.error || !editor.tenantId || !editor.form ? (
          <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-6 text-sm text-destructive">
            {formatError(editor.error || new Error("Aucun tenant associé à ce compte."))}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <div className="space-y-6 lg:order-1">
              {activeTab === "general" && (
                <GeneralTab form={editor.form} tenantId={editor.tenantId} update={editor.update} />
              )}
              {activeTab === "legal" && <LegalTab form={editor.form} update={editor.update} />}
              {activeTab === "catalog" && <CatalogTab />}
              {activeTab === "users" && <UsersTab />}
              {activeTab === "billing" && <BillingTab form={editor.form} update={editor.update} />}
              {activeTab === "documents" && (
                <DocumentsTab
                  form={editor.form}
                  tenantId={editor.tenantId}
                  update={editor.update}
                />
              )}
              {activeTab === "security" && <SecurityTab />}
            </div>
            <div className="space-y-6 lg:order-2">
              <CompanyPreviewCard form={editor.form} />
              <ConfigurationProgress form={editor.form} />
              <QuickActions
                form={editor.form}
                onImport={editor.merge}
                onReset={editor.revert}
                isDirty={editor.isDirty}
              />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

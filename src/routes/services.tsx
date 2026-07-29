import { createFileRoute } from "@tanstack/react-router";
import { PLATFORM_BRANDING } from "@/config/branding";
import { AppShell } from "@/components/mms/AppShell";
import { CatalogPage } from "@/components/mms/CatalogPage";

export const Route = createFileRoute("/services")({
  component: ServicesPage,
  head: () => ({
    meta: [
      { title: `Produits & Services — ${PLATFORM_BRANDING.productName}` },
      { name: "description", content: "Catalogue universel des produits et services." },
    ],
  }),
});

function ServicesPage() {
  return (
    <AppShell
      title="Produits & Services"
      subtitle="Gérez le catalogue propre à votre entreprise"
    >
      <CatalogPage />
    </AppShell>
  );
}

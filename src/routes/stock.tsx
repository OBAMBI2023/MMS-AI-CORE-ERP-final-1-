import { createFileRoute } from "@tanstack/react-router";
import { PLATFORM_BRANDING } from "@/config/branding";
import { AppShell } from "@/components/mms/AppShell";
import { StockPage } from "@/components/mms/StockPage";

export const Route = createFileRoute("/stock")({
  component: StockRoute,
  head: () => ({
    meta: [
      { title: `Stock — ${PLATFORM_BRANDING.productName}` },
      { name: "description", content: "Stock, alertes et historique des mouvements." },
    ],
  }),
});

function StockRoute() {
  return (
    <AppShell title="Stock" subtitle="Suivez et ajustez les stocks de vos produits">
      <StockPage />
    </AppShell>
  );
}

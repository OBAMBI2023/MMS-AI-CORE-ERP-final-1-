import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/mms/AppShell";
import { CategoriesPage } from "@/components/mms/CategoriesPage";

export const Route = createFileRoute("/categories")({
  component: CategoriesRoute,
  head: () => ({
    meta: [
      { title: "Catégories — AUREX ERP" },
      { name: "description", content: "Gestion des catégories du catalogue." },
    ],
  }),
});

function CategoriesRoute() {
  return (
    <AppShell
      title="Catégories"
      subtitle="Gérez les catégories de produits et services de votre entreprise"
    >
      <CategoriesPage />
    </AppShell>
  );
}

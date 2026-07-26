import { createFileRoute, redirect } from "@tanstack/react-router";

const erpRoutes = new Set([
  "achats",
  "clients",
  "depenses",
  "devis",
  "fournisseurs",
  "journal",
  "parametres",
  "rapports",
  "services",
  "utilisateurs",
  "ventes",
]);

export const Route = createFileRoute("/app/$")({
  beforeLoad: ({ params }) => {
    const destination = params._splat ?? "";
    if (erpRoutes.has(destination)) {
      throw redirect({ href: `/${destination}` });
    }
  },
  component: () => null,
});

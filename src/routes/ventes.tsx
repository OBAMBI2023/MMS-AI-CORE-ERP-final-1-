import { createFileRoute } from "@tanstack/react-router";
import { PLATFORM_BRANDING } from "@/config/branding";
import { PosPage } from "@/components/mms/PosPage";

// Testing replacement
export const Route = createFileRoute("/ventes")({
  component: PosPage,
  head: () => ({
    meta: [
      {
        title: `${PLATFORM_BRANDING.products.pos} — ${PLATFORM_BRANDING.products.erp}`,
      },
      {
        name: "description",
        content: "POS imprimerie : encaissement, panier et ticket de caisse.",
      },
    ],
  }),
});

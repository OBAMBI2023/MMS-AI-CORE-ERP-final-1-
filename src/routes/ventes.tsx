import { createFileRoute } from "@tanstack/react-router";
import { PosPage } from "@/components/mms/PosPage";

// Testing replacement
export const Route = createFileRoute("/ventes")({
  component: PosPage,
  head: () => ({
    meta: [
      { title: "Point de vente — MMS AI CORE" },
      {
        name: "description",
        content: "POS imprimerie : encaissement, panier et ticket de caisse.",
      },
    ],
  }),
});

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { VitrineHeader, VitrineFooter, VitrinePage } from "@/components/hotel-vitrine/VitrineLayout";
import { hotelVitrineHeadMeta } from "@/lib/hotel/hotel-seo";

// Vitrine publique SAOVIA Hôtel (/sitevitrine, /sitevitrine/hotels,
// /sitevitrine/hotels/:slug). Entièrement anonyme, aucune session
// ERP/Hôtel requise — mirrors isRestaurantRoute/isPublicOrderingRoute in
// __root.tsx, qui laissent ce préfixe passer sans garde d'authentification.
export const Route = createFileRoute("/sitevitrine")({
  head: () => ({ meta: hotelVitrineHeadMeta() }),
  component: HotelVitrineLayout,
});

function HotelVitrineLayout() {
  return (
    <VitrinePage>
      <VitrineHeader />
      <Outlet />
      <VitrineFooter />
    </VitrinePage>
  );
}

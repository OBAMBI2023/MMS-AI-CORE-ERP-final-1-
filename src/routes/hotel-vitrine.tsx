import { createFileRoute, Outlet } from "@tanstack/react-router";
import { VitrineHeader, VitrineFooter, VitrinePage } from "@/components/hotel-vitrine/VitrineLayout";

// Vitrine publique SAOVIA Hôtel (/hotel-vitrine, /hotel-vitrine/hotels,
// /hotel-vitrine/hotels/:slug). Entièrement anonyme, aucune session
// ERP/Hôtel requise — mirrors isRestaurantRoute/isPublicOrderingRoute in
// __root.tsx, qui laissent ce préfixe passer sans garde d'authentification.
export const Route = createFileRoute("/hotel-vitrine")({
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

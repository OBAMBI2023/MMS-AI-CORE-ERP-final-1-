import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import { HotelComingSoon } from "@/components/hotel/HotelComingSoon";

function HotelComptabilite() {
  return (
    <HotelComingSoon
      title="Comptabilité"
      icon={Calculator}
      description="Le journal comptable et le suivi financier de l'hôtel seront disponibles ici."
    />
  );
}

export const Route = createFileRoute("/hotel/comptabilite")({
  component: HotelComptabilite,
});

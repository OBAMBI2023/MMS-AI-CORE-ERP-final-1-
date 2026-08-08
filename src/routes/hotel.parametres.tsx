import { createFileRoute } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { HotelComingSoon } from "@/components/hotel/HotelComingSoon";

function HotelParametres() {
  return (
    <HotelComingSoon
      title="Paramètres"
      icon={Settings}
      description="La configuration de l'établissement (chambres, tarifs, taxes) sera disponible ici."
    />
  );
}

export const Route = createFileRoute("/hotel/parametres")({
  component: HotelParametres,
});

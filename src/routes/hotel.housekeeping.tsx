import { createFileRoute } from "@tanstack/react-router";
import { Sparkles } from "lucide-react";
import { HotelComingSoon } from "@/components/hotel/HotelComingSoon";

function HotelHousekeeping() {
  return (
    <HotelComingSoon
      title="Housekeeping"
      icon={Sparkles}
      description="Le suivi du nettoyage et de l'état des chambres sera disponible ici."
    />
  );
}

export const Route = createFileRoute("/hotel/housekeeping")({
  component: HotelHousekeeping,
});

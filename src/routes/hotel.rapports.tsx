import { createFileRoute } from "@tanstack/react-router";
import { BarChart3 } from "lucide-react";
import { HotelComingSoon } from "@/components/hotel/HotelComingSoon";

function HotelRapports() {
  return (
    <HotelComingSoon
      title="Rapports"
      icon={BarChart3}
      description="Les statistiques d'occupation, de revenus et de performance seront disponibles ici."
    />
  );
}

export const Route = createFileRoute("/hotel/rapports")({
  component: HotelRapports,
});

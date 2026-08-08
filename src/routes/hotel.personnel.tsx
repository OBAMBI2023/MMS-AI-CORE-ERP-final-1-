import { createFileRoute } from "@tanstack/react-router";
import { UserCog } from "lucide-react";
import { HotelComingSoon } from "@/components/hotel/HotelComingSoon";

function HotelPersonnel() {
  return (
    <HotelComingSoon
      title="Personnel"
      icon={UserCog}
      description="La gestion des équipes, des plannings et des rôles du personnel sera disponible ici."
    />
  );
}

export const Route = createFileRoute("/hotel/personnel")({
  component: HotelPersonnel,
});

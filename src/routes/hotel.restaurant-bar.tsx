import { createFileRoute } from "@tanstack/react-router";
import { UtensilsCrossed } from "lucide-react";
import { HotelComingSoon } from "@/components/hotel/HotelComingSoon";

function HotelRestaurantBar() {
  return (
    <HotelComingSoon
      title="Restaurant / Bar"
      icon={UtensilsCrossed}
      description="La prise de commande et la facturation du restaurant et du bar seront disponibles ici."
    />
  );
}

export const Route = createFileRoute("/hotel/restaurant-bar")({
  component: HotelRestaurantBar,
});

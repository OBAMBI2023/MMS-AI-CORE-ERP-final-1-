import { createFileRoute } from "@tanstack/react-router";
import { Boxes } from "lucide-react";
import { HotelComingSoon } from "@/components/hotel/HotelComingSoon";

function HotelStocks() {
  return (
    <HotelComingSoon
      title="Stocks"
      icon={Boxes}
      description="La gestion des stocks (linge, minibar, consommables, restauration) sera disponible ici."
    />
  );
}

export const Route = createFileRoute("/hotel/stocks")({
  component: HotelStocks,
});

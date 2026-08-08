import { createFileRoute } from "@tanstack/react-router";
import { KeyRound } from "lucide-react";
import { HotelComingSoon } from "@/components/hotel/HotelComingSoon";

function HotelCheckinCheckout() {
  return (
    <HotelComingSoon
      title="Check-in / Check-out"
      icon={KeyRound}
      description="Le processus d'arrivée et de départ des clients sera disponible ici."
    />
  );
}

export const Route = createFileRoute("/hotel/checkin-checkout")({
  component: HotelCheckinCheckout,
});

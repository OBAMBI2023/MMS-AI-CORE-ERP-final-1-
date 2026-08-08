import { createFileRoute } from "@tanstack/react-router";
import { HotelCaissePage } from "@/components/hotel/HotelCaissePage";

export const Route = createFileRoute("/hotel/caisse")({
  component: HotelCaissePage,
});

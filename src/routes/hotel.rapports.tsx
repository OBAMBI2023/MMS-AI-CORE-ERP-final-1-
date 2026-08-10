import { createFileRoute } from "@tanstack/react-router";
import { HotelRapportsPage } from "@/components/hotel/HotelRapportsPage";

export const Route = createFileRoute("/hotel/rapports")({
  component: HotelRapportsPage,
});

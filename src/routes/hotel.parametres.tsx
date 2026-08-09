import { createFileRoute } from "@tanstack/react-router";
import { HotelParametresPage } from "@/components/hotel/HotelParametresPage";

export const Route = createFileRoute("/hotel/parametres")({
  component: HotelParametresPage,
});

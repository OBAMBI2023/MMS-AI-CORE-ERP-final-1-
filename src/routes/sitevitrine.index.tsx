import { createFileRoute } from "@tanstack/react-router";
import { HotelVitrineHome } from "@/components/hotel-vitrine/HotelVitrineHome";

export const Route = createFileRoute("/sitevitrine/")({
  component: HotelVitrineHome,
});

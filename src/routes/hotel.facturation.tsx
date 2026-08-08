import { createFileRoute } from "@tanstack/react-router";
import { HotelFacturationPage } from "@/components/hotel/HotelFacturationPage";

export const Route = createFileRoute("/hotel/facturation")({
  component: HotelFacturationPage,
});

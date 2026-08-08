import { createFileRoute } from "@tanstack/react-router";
import { HotelClientsPage } from "@/components/hotel/HotelClientsPage";

export const Route = createFileRoute("/hotel/clients")({
  component: HotelClientsPage,
});

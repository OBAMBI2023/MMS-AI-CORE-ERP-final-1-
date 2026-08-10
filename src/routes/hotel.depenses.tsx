import { createFileRoute } from "@tanstack/react-router";
import { HotelDepensesPage } from "@/components/hotel/HotelDepensesPage";

export const Route = createFileRoute("/hotel/depenses")({
  component: HotelDepensesPage,
});

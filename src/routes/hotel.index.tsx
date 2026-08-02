import { createFileRoute } from "@tanstack/react-router";
import { HotelDashboardPage } from "@/components/hotel/HotelDashboard";

export const Route = createFileRoute("/hotel/")({
  component: HotelDashboardPage,
});

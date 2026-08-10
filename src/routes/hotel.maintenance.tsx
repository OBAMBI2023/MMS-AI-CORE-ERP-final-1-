import { createFileRoute } from "@tanstack/react-router";
import { HotelMaintenanceProvidersPage } from "@/components/hotel/HotelMaintenanceProvidersPage";

export const Route = createFileRoute("/hotel/maintenance")({
  component: HotelMaintenanceProvidersPage,
});

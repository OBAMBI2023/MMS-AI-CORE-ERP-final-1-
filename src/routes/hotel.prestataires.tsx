import { createFileRoute } from "@tanstack/react-router";
import { HotelProvidersPage } from "@/components/hotel/HotelProvidersPage";

export const Route = createFileRoute("/hotel/prestataires")({ component: HotelProvidersPage });

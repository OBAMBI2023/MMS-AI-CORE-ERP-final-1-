import { createFileRoute } from "@tanstack/react-router";
import { HotelSettingsPage } from "@/components/hotel/HotelSettingsPage";

export const Route = createFileRoute("/hotel/parametres")({ component: HotelSettingsPage });

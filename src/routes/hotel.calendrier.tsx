import { createFileRoute } from "@tanstack/react-router";
import { HotelCalendarPage } from "@/components/hotel/HotelCalendarPage";

export const Route = createFileRoute("/hotel/calendrier")({ component: HotelCalendarPage });

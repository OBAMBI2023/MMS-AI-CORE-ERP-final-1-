import { createFileRoute } from "@tanstack/react-router";
import { HotelRoomsPage } from "@/components/hotel/HotelRoomsCrud";

export const Route = createFileRoute("/hotel/chambres")({ component: HotelRoomsPage });

import { createFileRoute } from "@tanstack/react-router";
import { HotelCheckinCheckoutPage } from "@/components/hotel/HotelCheckinCheckoutPage";

export const Route = createFileRoute("/hotel/checkin-checkout")({
  component: HotelCheckinCheckoutPage,
});

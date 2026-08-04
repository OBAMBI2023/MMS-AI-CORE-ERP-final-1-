import { createFileRoute } from "@tanstack/react-router";
import { HotelInvoicingPage } from "@/components/hotel/HotelInvoicingPage";
export const Route = createFileRoute("/hotel/facturation")({ component: HotelInvoicingPage });

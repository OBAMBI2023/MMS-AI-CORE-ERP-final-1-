import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/hotel")({
  component: HotelLayout,
});

function HotelLayout() {
  return <Outlet />;
}

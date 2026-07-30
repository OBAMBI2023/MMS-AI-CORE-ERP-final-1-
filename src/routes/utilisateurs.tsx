import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/utilisateurs")({
  beforeLoad: () => {
    throw redirect({ to: "/settings/users", replace: true });
  },
});

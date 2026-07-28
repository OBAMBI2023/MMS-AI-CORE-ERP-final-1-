import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/partner-admin")({
  beforeLoad: () => {
    throw redirect({ to: "/partner", replace: true });
  },
});

import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/essai-gratuit")({
  beforeLoad: () => {
    throw redirect({ to: "/", replace: true });
  },
});

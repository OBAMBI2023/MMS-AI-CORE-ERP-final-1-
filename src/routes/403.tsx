import { createFileRoute } from "@tanstack/react-router";
import { ForbiddenPage } from "@/components/mms/ForbiddenPage";

export const Route = createFileRoute("/403")({
  component: ForbiddenPage,
});

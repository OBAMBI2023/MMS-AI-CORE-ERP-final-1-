import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const Assistant = lazy(() =>
  import("../assistant/pages/AssistantPage").then((m) => ({ default: m.AssistantPage })),
);

export const Route = createFileRoute("/assistant")({
  component: () => (
    <Suspense fallback={<div>Chargement de l'assistant...</div>}>
      <Assistant />
    </Suspense>
  ),
});

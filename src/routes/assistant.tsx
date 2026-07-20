import { createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

export const Route = createFileRoute("/assistant")({
  component: () => (
    <div className="flex items-center justify-center h-full p-6 text-center">
      <div className="p-6 rounded-2xl bg-muted border border-border">
        <h2 className="text-lg font-bold">Module temporairement désactivé</h2>
        <p className="text-sm text-muted-foreground mt-2">
          L'assistant IA est actuellement indisponible.
        </p>
      </div>
    </div>
  ),
});

import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

function RoutePendingIndicator() {
  return (
    <div
      className="fixed left-64 right-0 top-0 z-50 h-0.5 overflow-hidden bg-primary/15 max-md:left-0"
      role="progressbar"
      aria-label="Chargement du module"
    >
      <div className="h-full w-1/3 animate-pulse bg-primary" />
    </div>
  );
}

export const getRouter = () => {
  const queryClient = new QueryClient();

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreload: "intent",
    defaultPreloadStaleTime: 60_000,
    defaultPendingComponent: RoutePendingIndicator,
    defaultPendingMs: 150,
    defaultPendingMinMs: 200,
  });

  return router;
};

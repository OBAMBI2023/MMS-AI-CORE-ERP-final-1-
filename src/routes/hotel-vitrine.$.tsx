import { createFileRoute, redirect } from "@tanstack/react-router";

// Redirects every former /hotel-vitrine/* sub-path (e.g. /hotel-vitrine/hotels,
// /hotel-vitrine/hotels/:slug) to its /sitevitrine/* equivalent. Mirrors the
// app.$.tsx splat-redirect pattern. See hotel-vitrine.index.tsx for the bare
// /hotel-vitrine redirect.
export const Route = createFileRoute("/hotel-vitrine/$")({
  beforeLoad: ({ params }) => {
    const rest = params._splat ?? "";
    throw redirect({ href: rest ? `/sitevitrine/${rest}` : "/sitevitrine" });
  },
  component: () => null,
});

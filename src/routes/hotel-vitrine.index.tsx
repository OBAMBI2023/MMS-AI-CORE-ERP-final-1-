import { createFileRoute, redirect } from "@tanstack/react-router";

// /hotel-vitrine was briefly live in production before the SAOVIA HOTEL
// commercial landing took over hotel.saovia.net/ and the visitor vitrine
// moved to /sitevitrine. Kept as a redirect so any bookmarked/indexed link
// to the old path still lands somewhere real. See hotel-vitrine.$.tsx for
// the redirect covering its former sub-paths (/hotel-vitrine/hotels, ...).
export const Route = createFileRoute("/hotel-vitrine/")({
  beforeLoad: () => {
    throw redirect({ href: "/sitevitrine" });
  },
  component: () => null,
});

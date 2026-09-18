import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout pour /hotel-vitrine/hotels et ses enfants (/hotel-vitrine/hotels/:slug).
// Le contenu du catalogue lui-même vit dans hotel-vitrine.hotels.index.tsx —
// ce fichier ne doit rester qu'un simple Outlet, sinon il masque les routes
// enfants (même convention que hotel.tsx / hotel.index.tsx).
export const Route = createFileRoute("/hotel-vitrine/hotels")({
  component: () => <Outlet />,
});

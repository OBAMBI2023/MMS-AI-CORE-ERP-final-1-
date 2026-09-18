import { createFileRoute, Outlet } from "@tanstack/react-router";

// Layout pour /sitevitrine/hotels et ses enfants (/sitevitrine/hotels/:slug).
// Le contenu du catalogue lui-même vit dans sitevitrine.hotels.index.tsx —
// ce fichier ne doit rester qu'un simple Outlet, sinon il masque les routes
// enfants (même convention que hotel.tsx / hotel.index.tsx).
export const Route = createFileRoute("/sitevitrine/hotels")({
  component: () => <Outlet />,
});

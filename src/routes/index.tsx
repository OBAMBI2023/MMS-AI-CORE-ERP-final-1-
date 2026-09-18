import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { MarketingLayout } from "@/marketing/layouts/MarketingLayout";
import { HomePage } from "@/marketing/pages/HomePage";
import { VitrineHeader, VitrineFooter, VitrinePage } from "@/components/hotel-vitrine/VitrineLayout";
import { HotelVitrineHome } from "@/components/hotel-vitrine/HotelVitrineHome";

// Doit rester synchronisé avec PRODUCTION_HOTEL_ORIGIN dans
// src/lib/hotel/public-site-url.ts (dupliqué ici volontairement pour ne pas
// faire dépendre ce fichier, partagé par des composants 100% client du
// dashboard, d'un import serveur `@tanstack/react-start/server`).
const HOTEL_HOSTNAME = "hotel.saovia.net";

// `getRequest()` ne peut pas être importé/appelé directement dans un fichier
// de route (bundlé côté client) — TanStack Start bloque ça à la build
// ("import-protection"). On l'isole donc dans un createServerFn, le seul
// pont autorisé pour lire la requête serveur depuis un loader de route.
const getRequestHost = createServerFn({ method: "GET" }).handler(() => {
  return getRequest()?.headers.get("host") ?? "";
});

async function isHotelHostRequest(): Promise<boolean> {
  if (typeof window === "undefined") {
    const host = await getRequestHost();
    return host.split(":")[0].toLowerCase() === HOTEL_HOSTNAME;
  }
  return window.location.hostname.toLowerCase() === HOTEL_HOSTNAME;
}

export const Route = createFileRoute("/")({
  loader: async () => ({ isHotelHost: await isHotelHostRequest() }),
  component: RootIndexRoute,
});

function RootIndexRoute() {
  const { isHotelHost } = Route.useLoaderData();

  if (isHotelHost) {
    return (
      <VitrinePage>
        <VitrineHeader />
        <HotelVitrineHome />
        <VitrineFooter />
      </VitrinePage>
    );
  }

  return (
    <MarketingLayout>
      <HomePage />
    </MarketingLayout>
  );
}

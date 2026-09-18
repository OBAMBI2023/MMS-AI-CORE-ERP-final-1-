import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { supabase } from "@/integrations/supabase/client";
import { TrialSignupPage } from "@/marketing/pages/TrialSignupPage";
import { HotelTrialSignupPage } from "@/components/hotel-landing/HotelTrialSignupPage";
import { getAuthenticatedDestination } from "@/lib/partner-admin.server";
import { hotelTrialSignupHeadMeta } from "@/lib/hotel/hotel-seo";

// Même détection hostname que src/routes/index.tsx (dupliquée volontairement,
// voir le commentaire là-bas : un composant 100% client ne peut pas importer
// @tanstack/react-start/server).
const HOTEL_HOSTNAME = "hotel.saovia.net";

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

export const Route = createFileRoute("/essai-gratuit")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) throw redirect({ to: await getAuthenticatedDestination() });
  },
  loader: async () => ({ isHotelHost: await isHotelHostRequest() }),
  head: ({ loaderData }) => (loaderData?.isHotelHost ? { meta: hotelTrialSignupHeadMeta() } : {}),
  component: EssaiGratuitRoute,
});

function EssaiGratuitRoute() {
  const { isHotelHost } = Route.useLoaderData();
  return isHotelHost ? <HotelTrialSignupPage /> : <TrialSignupPage />;
}

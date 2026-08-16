import { createFileRoute, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { HotelParametresPage } from "@/components/hotel/HotelParametresPage";
import { isAdministratorRole } from "@/lib/route-permissions";

export const Route = createFileRoute("/hotel/parametres")({
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session?.user?.id) {
      throw redirect({ to: "/login" });
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("roles(name)")
      .eq("id", session.user.id)
      .single();

    const roleName = data?.roles?.name ?? null;

    if (error || !isAdministratorRole(roleName)) {
      throw redirect({ to: "/hotel" });
    }
  },
  component: HotelParametresPage,
});

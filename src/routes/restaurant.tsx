import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { RestaurantApp } from "@/components/restaurant/RestaurantApp";
import { restaurantSupabase } from "@/integrations/restaurant/restaurant-supabase-client";

export const Route = createFileRoute("/restaurant")({
  head: () => ({
    meta: [{ title: "SAOVIA Restaurant" }],
  }),
  component: RestaurantRoute,
});

function RestaurantRoute() {
  const [email, setEmail] = useState<string | null>(null);
  const [restaurantName, setRestaurantName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const { data: sessionData } = await restaurantSupabase.auth.getSession();
      console.log("restaurant route guard session present", {
        present: Boolean(sessionData.session),
      });

      if (cancelled) return;
      if (!sessionData.session) {
        console.error("restaurant route redirecting to login", {
          reason: "missing restaurant session",
        });
        window.location.replace("/login");
        return;
      }

      const { data: userData, error: userError } = await restaurantSupabase.auth.getUser();
      if (userError || !userData.user) {
        console.error("restaurant route redirecting to login", {
          reason: userError?.message ?? "missing restaurant user",
        });
        window.location.replace("/login");
        return;
      }

      const { data: membership, error: membershipError } = await restaurantSupabase
        .from("restaurant_memberships")
        .select("restaurant_id,role,status")
        .eq("user_id", userData.user.id)
        .eq("status", "active")
        .maybeSingle();

      console.log("restaurant membership active", {
        active: Boolean(membership),
      });

      if (cancelled) return;
      if (membershipError || !membership) {
        console.error("restaurant route redirecting to login", {
          reason: membershipError?.message ?? "missing active restaurant membership",
        });
        window.location.replace("/login");
        return;
      }

      setEmail(userData.user.email ?? null);
      setRestaurantName(
        (userData.user.user_metadata?.restaurant_name as string | undefined) ?? "SAOVIA RESTAURANT",
      );
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = async () => {
    const { restaurantSupabase } = await import("@/integrations/restaurant/restaurant-supabase-client");
    await restaurantSupabase.auth.signOut();
    window.location.replace("/essai-gratuit");
  };

  if (isLoading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 px-6 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-saovia-primary">Restaurant</p>
          <p className="mt-3 text-slate-600">Chargement de votre espace Restaurant...</p>
          <Link to="/essai-gratuit" className="mt-4 inline-flex text-sm font-semibold text-saovia-primary">
            Retour à l’essai
          </Link>
        </div>
      </main>
    );
  }

  return <RestaurantApp email={email} restaurantName={restaurantName} onLogout={handleLogout} />;
}

import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useTenant } from "@/providers/TenantProvider";

// Shared auth guard for every /hotel/* route (this file becomes their
// parent layout under TanStack Router's flat file-routing convention).
// Deliberately NOT a `beforeLoad` Supabase call: that pattern (see the
// now-reverted hotel.parametres.tsx beforeLoad) races the Supabase client's
// session rehydration on a hard navigation/reload and produces false
// "logged out" redirects. TenantProvider already resolves auth/tenant state
// reliably via supabase.auth.onAuthStateChange (the same source every hotel
// page already reads through useTenant()/usePermissions()), so this reuses
// that instead of adding a second, router-level auth path.
//
// This is a UX redirect only — it does not replace or weaken RLS. Every
// hotel_* table's Row Level Security (hotel_permission_for(), verified
// during the QA audit) remains the actual data boundary regardless of
// whether this guard runs.
export const Route = createFileRoute("/hotel")({
  component: HotelLayout,
});

function HotelLayout() {
  const { profile, tenant, loading } = useTenant();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!profile || !tenant) {
      void navigate({ to: "/login", replace: true });
    }
  }, [loading, profile, tenant, navigate]);

  return <Outlet />;
}

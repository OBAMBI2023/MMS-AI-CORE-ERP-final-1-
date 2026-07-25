import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant, TenantProfile } from "@/types/tenant";

type TenantContextType = {
  profile: TenantProfile | null;
  tenant: Tenant | null;
  loading: boolean;
};

const TenantContext = createContext<TenantContextType>({
  profile: null,
  tenant: null,
  loading: true,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadTenant(session: Session | null) {
      if (!active) return;
      setLoading(true);
      setProfile(null);
      setTenant(null);
      if (!session) {
        if (active) setLoading(false);
        return;
      }

      // profiles/tenants are not present in the currently generated Database type.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: profileData } = await (supabase as any)
        .from("profiles")
        .select("id, email, tenant_id, role_id")
        .eq("id", session.user.id)
        .single();

      if (!active || !profileData?.tenant_id) {
        if (active) setLoading(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: tenantData } = await (supabase as any)
        .from("tenants")
        .select("*")
        .eq("id", profileData.tenant_id)
        .single();

      if (active) {
        setProfile(profileData as TenantProfile);
        setTenant((tenantData as Tenant | null) ?? null);
        setLoading(false);
      }
    }

    void supabase.auth.getSession().then(({ data }) => loadTenant(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadTenant(session);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <TenantContext.Provider
      value={{
        profile,
        tenant,
        loading,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}

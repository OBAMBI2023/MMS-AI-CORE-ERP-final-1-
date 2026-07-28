import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Tenant, TenantProfile } from "@/types/tenant";
import { configureCurrency, DEFAULT_CURRENCY } from "@/lib/mms/format";

type TenantContextType = {
  profile: TenantProfile | null;
  tenant: Tenant | null;
  loading: boolean;
  refreshTenant: () => Promise<string | null>;
};

const TenantContext = createContext<TenantContextType>({
  profile: null,
  tenant: null,
  loading: true,
  refreshTenant: async () => null,
});

export function TenantProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<TenantProfile | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [loading, setLoading] = useState(true);
  const loadSequence = useRef(0);

  const loadTenant = useCallback(async (session: Session | null) => {
    const sequence = ++loadSequence.current;
    setLoading(true);
    if (!session) {
      configureCurrency(DEFAULT_CURRENCY);
      setProfile(null);
      setTenant(null);
      setLoading(false);
      return null;
    }

    try {
    // profiles/tenants are not present in the currently generated Database type.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    console.info("[TenantProvider] user.id", session.user.id);

    const profileResult = await (supabase as any)
      .from("profiles")
      .select("id, email, tenant_id, role_id")
      .eq("id", session.user.id)
      .maybeSingle();
    const { data: profileData, error: profileError, status: profileStatus } = profileResult;

    console.info("[TenantProvider] Résultat complet de la requête profiles", profileResult);
    console.info("[TenantProvider] Code HTTP Supabase profiles", profileStatus);
    if (profileError) {
      console.error("[TenantProvider] Erreur Supabase profiles", {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      });
    }

    const sessionTenant =
      session.user.app_metadata?.tenant_id ?? session.user.user_metadata?.tenant_id ?? null;
    console.info("[TenantProvider] Résolution du tenant authentifié", {
      user_id: session.user.id,
      tenant_id: profileData?.tenant_id ?? null,
      profile_tenant_id: profileData?.tenant_id ?? null,
      session_tenant: sessionTenant,
    });

    if (sequence !== loadSequence.current) return null;
    if (profileError || !profileData || !profileData.tenant_id) {
      const reason = profileError
        ? "La requête profiles a échoué"
        : !profileData
          ? "Le profil auth.users.id est absent ou invisible pour la politique RLS"
          : "Le profil existe mais tenant_id est absent";
      console.error("[TenantProvider] Profil tenant non résolu", {
        reason,
        user_id: session.user.id,
        tenant_id: null,
        profile_tenant_id: profileData?.tenant_id ?? null,
        session_tenant: sessionTenant,
        http_status: profileStatus,
        error: profileError
          ? {
              code: profileError.code,
              message: profileError.message,
              details: profileError.details,
              hint: profileError.hint,
            }
          : null,
      });
      setProfile(null);
      setTenant(null);
      setLoading(false);
      return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const tenantResult = await (supabase as any)
      .from("tenants")
      .select("*")
      .eq("id", profileData.tenant_id)
      .maybeSingle();
    const { data: tenantData, error: tenantError, status: tenantStatus } = tenantResult;
    const { data: currencySettings } = await (supabase as any)
      .from("parametres")
      .select("currency,decimals")
      .eq("tenant_id", profileData.tenant_id)
      .limit(1)
      .maybeSingle();

    if (sequence === loadSequence.current) {
      configureCurrency(currencySettings?.currency, currencySettings?.decimals);
      if (tenantError || !tenantData) {
        console.error("[TenantProvider] Tenant du profil introuvable", {
          user_id: session.user.id,
          tenant_id: profileData.tenant_id,
          profile_tenant_id: profileData.tenant_id,
          session_tenant: sessionTenant,
          http_status: tenantStatus,
          error: tenantError
            ? {
                code: tenantError.code,
                message: tenantError.message,
                details: tenantError.details,
                hint: tenantError.hint,
              }
            : null,
        });
      }
      setProfile(profileData as TenantProfile);
      setTenant((tenantData as Tenant | null) ?? null);
      setLoading(false);
    }
    return profileData.tenant_id as string;
    } catch (error) {
      if (sequence === loadSequence.current) {
        console.error("[TenantProvider] Échec inattendu du chargement du tenant", { error });
        setProfile(null);
        setTenant(null);
        configureCurrency(DEFAULT_CURRENCY);
        setLoading(false);
      }
      return null;
    }
  }, []);

  const refreshTenant = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) {
      console.error("[TenantProvider] Session absente pendant la recharge", { error });
      return null;
    }
    return loadTenant(data.session);
  }, [loadTenant]);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => loadTenant(data.session));
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadTenant(session);
    });

    return () => {
      loadSequence.current += 1;
      subscription.unsubscribe();
    };
  }, [loadTenant]);

  return (
    <TenantContext.Provider
      value={{
        profile,
        tenant,
        loading,
        refreshTenant,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
}

export function useTenant() {
  return useContext(TenantContext);
}

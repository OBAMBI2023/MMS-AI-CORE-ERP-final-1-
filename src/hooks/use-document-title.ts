import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useTenant } from "@/providers/TenantProvider";
import { resolveDocumentTitle } from "@/lib/document-title";

/**
 * Centralized document.title management: reacts to route changes (via the
 * router's own location state) and to the current tenant (via the existing
 * TenantProvider context) — no page needs to set document.title itself.
 * Within a recognized scope (ERP/Hotel/Super Admin/Login), resolveDocumentTitle
 * already falls back to a SAOVIA-branded title while the tenant/page name
 * isn't ready yet. Outside those scopes it returns null and this hook leaves
 * document.title exactly as the route's own `head()` set it.
 */
export function useDocumentTitle() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { tenant, loading } = useTenant();

  useEffect(() => {
    const resolved = resolveDocumentTitle(pathname, loading ? null : tenant?.name);
    if (resolved) document.title = resolved;
  }, [pathname, tenant?.name, loading]);
}

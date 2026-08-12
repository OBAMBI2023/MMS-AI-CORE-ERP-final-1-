import { PLATFORM_BRANDING } from "@/config/branding";

/**
 * Readable page name per route, keyed by pathname with any trailing slash
 * stripped (see normalize()). Extend these maps when a new top-level ERP,
 * Hotel or Super Admin route is added — everything else (document.title
 * formatting, tenant substitution, route-change reactivity) is centralized
 * in useDocumentTitle() and never needs touching per-page.
 */
const ERP_ROUTE_TITLES: Record<string, string> = {
  "/app": "Tableau de bord",
  "/app/assistant-ia": "Assistant IA",
  "/ventes": "Ventes",
  "/devis": "Devis",
  "/clients": "Clients",
  "/fournisseurs": "Fournisseurs",
  "/achats": "Achats",
  "/depenses": "Dépenses",
  "/rapports": "Rapports",
  "/parametres": "Paramètres",
  "/utilisateurs": "Utilisateurs",
  "/services": "Services",
  "/categories": "Catégories",
  "/stock": "Stock",
  "/journal": "Journal",
  "/licence": "Licence",
  "/support": "Support",
  "/settings/catalogue": "Catalogue",
  "/settings/users": "Utilisateurs",
};

const HOTEL_ROUTE_TITLES: Record<string, string> = {
  "/hotel": "Tableau de bord",
  "/hotel/reservations": "Réservations",
  "/hotel/chambres": "Chambres",
  "/hotel/clients": "Voyageurs",
  "/hotel/depenses": "Dépenses",
  "/hotel/rapports": "Rapports",
  "/hotel/parametres": "Paramètres",
  "/hotel/caisse": "Caisse",
  "/hotel/checkin-checkout": "Check-in / Check-out",
  "/hotel/comptabilite": "Comptabilité",
  "/hotel/facturation": "Facturation",
  "/hotel/housekeeping": "Housekeeping",
  "/hotel/maintenance": "Prestataires",
  "/hotel/personnel": "Personnel",
  "/hotel/restaurant-bar": "Restaurant & Bar",
  "/hotel/stocks": "Stocks",
};

const SUPER_ADMIN_ROUTE_TITLES: Record<string, string> = {
  "/super-admin": "Tableau de bord",
  "/super-admin/partners": "Partenaires",
  "/super-admin/users": "Utilisateurs",
  "/super-admin/support": "Support",
  "/super-admin/ia-platform": PLATFORM_BRANDING.products.ai,
};

function normalize(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
}

/**
 * Builds the document.title for the current route, in the SAOVIA-wide
 * "{Page} | {Tenant|Super Admin} | SAOVIA" format (or "Connexion | SAOVIA"
 * for login). Returns null for any route outside ERP/Hotel/Super
 * Admin/Login — callers should leave document.title untouched in that case
 * rather than guess, so pages like marketing/partner keep whatever their
 * own route `head()` already sets.
 */
export function resolveDocumentTitle(
  pathname: string,
  tenantName: string | null | undefined,
): string | null {
  const path = normalize(pathname);
  const brand = PLATFORM_BRANDING.shortName;
  const tenant = tenantName?.trim() || null;

  if (path === "/login" || path.startsWith("/login/")) {
    return `Connexion | ${brand}`;
  }

  if (path === "/super-admin" || path.startsWith("/super-admin/")) {
    const page = SUPER_ADMIN_ROUTE_TITLES[path];
    return page ? `${page} | Super Admin | ${brand}` : `Super Admin | ${brand}`;
  }

  if (path === "/hotel" || path.startsWith("/hotel/")) {
    const page = HOTEL_ROUTE_TITLES[path];
    if (!page) return tenant ? `${tenant} | ${brand}` : brand;
    return tenant ? `${page} | ${tenant} | ${brand}` : `${page} | ${brand}`;
  }

  const erpPage = ERP_ROUTE_TITLES[path];
  if (erpPage) {
    return tenant ? `${erpPage} | ${tenant} | ${brand}` : `${erpPage} | ${brand}`;
  }

  return null;
}

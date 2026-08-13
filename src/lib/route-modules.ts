export const routeModules: Record<string, string> = {
  "/app": "dashboard",
  "/app/assistant-ia": "ai_assistant",
  "/ventes": "sales",
  "/services": "products_services",
  "/categories": "products_services",
  "/stock": "inventory",
  "/clients": "customers",
  "/fournisseurs": "suppliers",
  "/achats": "purchases",
  "/depenses": "expenses",
  "/fiscalite": "fiscalite",
  "/devis": "quotes",
  "/rapports": "reports",
  "/parametres": "settings",
  "/settings/catalogue": "settings",
  "/settings/users": "users",
  "/utilisateurs": "users",
  "/support": "support",
};

export function getRouteModule(pathname: string) {
  const route = Object.keys(routeModules)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
  return route ? routeModules[route] : undefined;
}

/** Same idea as `routeModules`, scoped to the Hotel sidebar's own route set
 * (HotelSidebarContent doesn't share routes with the ERP sidebar above). */
export const hotelRouteModules: Record<string, string> = {
  "/hotel/maintenance": "hotel_maintenance",
  "/support": "support",
};

export function getHotelRouteModule(pathname: string) {
  const route = Object.keys(hotelRouteModules)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
  return route ? hotelRouteModules[route] : undefined;
}

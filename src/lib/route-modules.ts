export const routeModules: Record<string, string> = {
  "/app": "dashboard",
  "/ventes": "sales",
  "/services": "products_services",
  "/categories": "products_services",
  "/stock": "inventory",
  "/clients": "customers",
  "/fournisseurs": "suppliers",
  "/achats": "purchases",
  "/depenses": "expenses",
  "/devis": "quotes",
  "/rapports": "reports",
  "/parametres": "settings",
  "/utilisateurs": "users",
};

export function getRouteModule(pathname: string) {
  const route = Object.keys(routeModules)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
  return route ? routeModules[route] : undefined;
}

export const routePermissions: Record<string, string> = {
  "/app": "dashboard.view",
  "/ventes": "ventes.view",
  "/devis": "ventes.view",
  "/clients": "clients.view",
  "/services": "ventes.view",
  "/categories": "ventes.view",
  "/stock": "ventes.view",
  "/achats": "achats.view",
  "/fournisseurs": "achats.view",
  "/depenses": "ventes.view",
  "/parametres": "settings.manage",
  "/utilisateurs": "settings.manage",
};

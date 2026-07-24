export const routePermissions: Record<string, string> = {
  "/": "dashboard.view",
  "/ventes": "ventes.view",
  "/devis": "ventes.view",
  "/clients": "clients.view",
  "/services": "ventes.view",
  "/achats": "achats.view",
  "/fournisseurs": "achats.view",
  "/depenses": "ventes.view",
  "/rapports": "ventes.view",
  "/parametres": "settings.manage",
};

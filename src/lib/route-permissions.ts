// "Administrateur" est un libellé contraint côté DB par
// roles_tenant_role_name_check (CHECK sur un ensemble fixe de 7 rôles) et par
// la fonction RLS public.is_admin(), pas un libellé traduit affiché à l'écran :
// un rôle secondaire ne peut jamais porter ce nom. On centralise la
// comparaison ici pour n'avoir qu'un seul endroit à faire évoluer si le
// modèle de rôles change (ex: colonne roles.is_admin dédiée).
export const ADMINISTRATOR_ROLE_NAME = "Administrateur";

export function isAdministratorRole(roleName: string | null | undefined): boolean {
  return roleName === ADMINISTRATOR_ROLE_NAME;
}

/**
 * Paramètres et gestion des utilisateurs (ERP) restent exclusifs à
 * l'Administrateur, quel que soit l'état des permissions RBAC individuelles
 * du rôle secondaire. Tous les autres modules métier actifs pour le tenant
 * sont ouverts à tout rôle secondaire dès lors que le module est actif
 * (cf. route-modules.ts).
 *
 * /hotel/parametres n'en fait PAS partie : cette route est gérée par les
 * permissions RBAC hotel.settings.view / hotel.settings.update (cf.
 * isHotelSettingsRoute ci-dessous), car des rôles secondaires (ex: "Gérant")
 * peuvent légitimement s'y voir accorder ces permissions en base.
 */
export function isAdminOnlyRoute(pathname: string): boolean {
  return (
    pathname === "/parametres" ||
    pathname === "/utilisateurs" ||
    pathname === "/settings" ||
    pathname.startsWith("/parametres/") ||
    pathname.startsWith("/utilisateurs/") ||
    pathname.startsWith("/settings/")
  );
}

/**
 * Paramètres Hôtel : accès gouverné par la permission RBAC
 * hotel.settings.view (lecture) / hotel.settings.update (écriture), pas par
 * le nom du rôle. L'Administrateur y a toujours accès via le bypass
 * public.is_admin() intégré à public.has_permission(). Un rôle secondaire
 * (ex: "Gérant") y accède uniquement si le tenant lui a explicitement
 * attribué hotel.settings.view.
 */
export function isHotelSettingsRoute(pathname: string): boolean {
  return pathname === "/hotel/parametres" || pathname.startsWith("/hotel/parametres/");
}

/**
 * Paramètres ERP : /parametres, réservé aux tenants platform_type='ERP'. Un
 * tenant HOTEL ne doit jamais afficher cette route (cf. isHotelSettingsRoute
 * pour son équivalent Hôtel) — le garde de src/routes/__root.tsx redirige
 * vers /hotel/parametres dès que tenants.platform_type === 'HOTEL'.
 */
export function isErpParametresRoute(pathname: string): boolean {
  return pathname === "/parametres" || pathname.startsWith("/parametres/");
}

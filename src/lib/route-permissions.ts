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
 * Paramètres et gestion des utilisateurs restent exclusifs à l'Administrateur,
 * quel que soit l'état des permissions RBAC individuelles du rôle secondaire.
 * Tous les autres modules métier actifs pour le tenant sont ouverts à tout
 * rôle secondaire dès lors que le module est actif (cf. route-modules.ts).
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

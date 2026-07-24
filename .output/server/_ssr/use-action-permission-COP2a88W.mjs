import { t as usePermissions } from "./use-permissions-CTEhPLNH.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-action-permission-COP2a88W.js
function useActionPermission(permission) {
	const { data, isLoading } = usePermissions();
	if (isLoading || !data) return false;
	if (data.role === "Administrateur") return true;
	return data.permissions.includes(permission);
}
//#endregion
export { useActionPermission as t };

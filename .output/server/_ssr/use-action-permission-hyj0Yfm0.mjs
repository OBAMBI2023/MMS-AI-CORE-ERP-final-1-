import { t as usePermissions } from "./use-permissions-Bk8eXqHd.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-action-permission-hyj0Yfm0.js
function useActionPermission(permission) {
	const { data, isLoading } = usePermissions();
	if (isLoading || !data) return false;
	if (data.role === "Administrateur") return true;
	return data.permissions.includes(permission);
}
//#endregion
export { useActionPermission as t };

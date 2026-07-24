import { t as supabase } from "./client-BJMeE8ke.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-permissions-CTEhPLNH.js
function usePermissions() {
	return useQuery({
		queryKey: ["permissions"],
		queryFn: async () => {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return {
				permissions: [],
				role: null
			};
			const { data, error } = await supabase.from("profiles").select(`
          roles(
            id,
            name
          )
        `).eq("id", user.id).single();
			if (error || !data) return {
				permissions: [],
				role: null
			};
			const roleName = data.roles?.name || null;
			const roleId = data.roles?.id || null;
			const { data: allPerms } = await supabase.from("permissions").select("code");
			const allPermissionsCodes = allPerms?.map((p) => p.code) || [];
			if (roleName === "Administrateur") return {
				permissions: allPermissionsCodes,
				role: roleName,
				roleId
			};
			return {
				permissions: allPermissionsCodes.filter((p) => p !== "settings.manage" && p !== "ventes.delete"),
				role: roleName,
				roleId
			};
		}
	});
}
//#endregion
export { usePermissions as t };

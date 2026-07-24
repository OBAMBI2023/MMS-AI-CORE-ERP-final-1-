import { t as supabase } from "./client-BN74eToN.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-permissions-Bk8eXqHd.js
function usePermissions() {
	return useQuery({
		queryKey: ["permissions"],
		queryFn: async () => {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return {
				permissions: [],
				role: null
			};
			const { data, error } = await supabase.from("profiles").select("role_id, roles(name)").eq("id", user.id).single();
			if (error || !data) return {
				permissions: [],
				role: null
			};
			const roleId = data.role_id;
			const roleName = data.roles?.name;
			const { data: rolePermissions, error: permsError } = await supabase.from("role_permissions").select(`permissions(code)`).eq("role_id", roleId);
			if (permsError) return {
				permissions: [],
				role: null
			};
			return {
				permissions: rolePermissions.map((rp) => rp.permissions.code),
				role: roleName,
				roleId
			};
		}
	});
}
//#endregion
export { usePermissions as t };

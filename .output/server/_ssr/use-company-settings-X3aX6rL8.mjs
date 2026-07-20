import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/use-company-settings-X3aX6rL8.js
var import_react = /* @__PURE__ */ __toESM(require_react());
function useSignedUrl(path, bucket = "company-assets") {
	const [url, setUrl] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		let alive = true;
		if (!path) {
			setUrl(null);
			return;
		}
		supabase.storage.from(bucket).createSignedUrl(path, 3600).then(({ data }) => {
			if (alive) setUrl(data?.signedUrl ?? null);
		});
		return () => {
			alive = false;
		};
	}, [path, bucket]);
	return url;
}
function useCompanySettings() {
	const { data: settings, isLoading } = useQuery({
		queryKey: ["parametres"],
		queryFn: async () => {
			const { data, error } = await supabase.from("parametres").select("*").limit(1).maybeSingle();
			if (error) throw error;
			return data;
		}
	});
	return {
		settings,
		logoUrl: useSignedUrl(settings?.logo_url ?? null),
		isLoading,
		companyName: settings?.company_name ?? "Maguy Multi Services",
		address: settings?.address ?? "",
		phone: settings?.phone ?? "",
		email: settings?.email ?? ""
	};
}
//#endregion
export { useSignedUrl as n, useCompanySettings as t };

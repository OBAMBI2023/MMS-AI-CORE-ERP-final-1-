import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { H as LoaderCircle } from "../_libs/lucide-react.mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-C0WYWEQX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/journal-jso_-A4I.js
var import_jsx_runtime = require_jsx_runtime();
function ActivityLogPage() {
	const { data: logs, isLoading } = useQuery({
		queryKey: ["activity_logs"],
		queryFn: async () => {
			const { data, error } = await supabase.from("activity_logs").select(`
          *,
          admin:profiles!activity_logs_admin_id_fkey(full_name),
          affected_user:profiles!activity_logs_affected_user_id_fkey(full_name)
        `).order("created_at", { ascending: false });
			if (error) throw error;
			return data;
		}
	});
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "p-6 space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
			className: "text-xl font-semibold",
			children: "Journal d'activité"
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "border rounded-lg",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Date" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Administrateur" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Action" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Utilisateur concerné" })
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableBody, { children: logs?.map((log) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: new Date(log.created_at).toLocaleString() }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: log.admin?.full_name }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: log.action }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: log.affected_user?.full_name })
			] }, log.id)) })] })
		})]
	});
}
function JournalPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ActivityLogPage, {});
}
//#endregion
export { JournalPage as component };

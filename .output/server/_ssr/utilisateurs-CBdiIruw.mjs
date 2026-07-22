import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { H as LoaderCircle, O as Plus, et as Ellipsis } from "../_libs/lucide-react.mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { i as useQueryClient, n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as Button } from "./button-Bq5vK6RO.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-C0WYWEQX.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/utilisateurs-CBdiIruw.js
var import_jsx_runtime = require_jsx_runtime();
function UserManagement() {
	useQueryClient();
	const { data: users, isLoading } = useQuery({
		queryKey: ["users"],
		queryFn: async () => {
			const { data, error } = await supabase.from("profiles").select(`
          id, username, full_name, phone, status, last_login_at, created_at,
          roles(id, name)
        `);
			if (error) throw error;
			return data;
		}
	});
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex justify-between items-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xl font-semibold",
				children: "Utilisateurs"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-2 h-4 w-4" }), " Nouvel utilisateur"] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "border rounded-lg",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Nom" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Email" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Rôle" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Statut" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Actions" })
			] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableBody, { children: users?.map((user) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: user.full_name }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: user.username }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: user.roles?.name }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: user.status }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "ghost",
					size: "icon",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, { className: "h-4 w-4" })
				}) })
			] }, user.id)) })] })
		})]
	});
}
function UserManagementPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "p-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserManagement, {})
	});
}
//#endregion
export { UserManagementPage as component };

import { L as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as AppShell } from "./AppShell-DPS6HqUC.mjs";
import { n as formatDate } from "./format-DujI6J5F.mjs";
import { t as ResourceTable } from "./ResourceTable-C0lgv-Hx.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/clients-DBj6PQr2.js
var import_jsx_runtime = require_jsx_runtime();
var fields = [
	{
		name: "name",
		label: "Nom",
		required: true,
		colSpan: 2
	},
	{
		name: "phone",
		label: "Téléphone",
		type: "tel"
	},
	{
		name: "email",
		label: "Email",
		type: "email"
	},
	{
		name: "address",
		label: "Adresse",
		colSpan: 2
	},
	{
		name: "notes",
		label: "Notes",
		type: "textarea"
	}
];
var columns = [
	{
		header: "Nom",
		cell: (r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-medium",
			children: r.name
		})
	},
	{
		header: "Téléphone",
		cell: (r) => r.phone ?? "-"
	},
	{
		header: "Email",
		cell: (r) => r.email ?? "-"
	},
	{
		header: "Ajouté le",
		cell: (r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-muted-foreground text-xs",
			children: formatDate(r.created_at)
		})
	}
];
function ClientsPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Clients",
		subtitle: "Répertoire de vos clients",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResourceTable, {
			table: "clients",
			singular: "Client",
			plural: "Clients",
			fields,
			columns,
			searchFields: [
				"name",
				"phone",
				"email"
			],
			orderBy: {
				column: "created_at",
				ascending: false
			},
			deletePermission: "clients.delete",
			entityName: "clients"
		})
	});
}
//#endregion
export { ClientsPage as component };

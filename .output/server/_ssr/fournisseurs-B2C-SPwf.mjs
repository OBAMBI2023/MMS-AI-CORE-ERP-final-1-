import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as AppShell } from "./AppShell-DBY349Tw.mjs";
import { t as formatDate } from "./format-p1WSdr6g.mjs";
import { t as ResourceTable } from "./ResourceTable-BSRvee0Y.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/fournisseurs-B2C-SPwf.js
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
function FournisseursPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Fournisseurs",
		subtitle: "Vos partenaires et prestataires",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResourceTable, {
			table: "fournisseurs",
			singular: "Fournisseur",
			plural: "Fournisseurs",
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
			}
		})
	});
}
//#endregion
export { FournisseursPage as component };

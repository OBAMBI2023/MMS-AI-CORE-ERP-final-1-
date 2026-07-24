import { L as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { t as AppShell } from "./AppShell-Ub1Z1wcC.mjs";
import { t as formatCurrency } from "./format-DujI6J5F.mjs";
import { t as ResourceTable } from "./ResourceTable-Dm4rwXxP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/services-BTE9jS5E.js
var import_jsx_runtime = require_jsx_runtime();
var fields = [
	{
		name: "name",
		label: "Nom du service",
		required: true,
		colSpan: 2
	},
	{
		name: "category",
		label: "Catégorie",
		type: "select",
		options: [
			"Impression",
			"Copie",
			"Reliure",
			"Finition",
			"Numérique",
			"Autre"
		],
		required: true
	},
	{
		name: "unit",
		label: "Unité",
		placeholder: "page, unité, lot..."
	},
	{
		name: "price",
		label: "Prix (FCFA)",
		type: "number",
		required: true,
		step: "1"
	}
];
var columns = [
	{
		header: "Service",
		cell: (r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-medium",
			children: r.name
		})
	},
	{
		header: "Catégorie",
		cell: (r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs px-2 py-1 rounded-full bg-primary/10 text-primary",
			children: r.category
		})
	},
	{
		header: "Unité",
		cell: (r) => r.unit
	},
	{
		header: "Prix",
		cell: (r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "font-semibold text-primary",
			children: formatCurrency(Number(r.price))
		})
	}
];
function ServicesPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Produits & Services",
		subtitle: "Catalogue des prestations proposées au comptoir",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResourceTable, {
			table: "services",
			singular: "Service",
			plural: "Produits & Services",
			fields,
			columns,
			searchFields: ["name", "category"],
			orderBy: {
				column: "created_at",
				ascending: false
			},
			defaultValues: {
				category: "Impression",
				unit: "unité",
				active: true
			},
			deletePermission: "services.delete",
			entityName: "services"
		})
	});
}
//#endregion
export { ServicesPage as component };

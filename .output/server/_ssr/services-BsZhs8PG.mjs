import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as AppShell } from "./AppShell-B_T5tO-_.mjs";
import { r as formatFCFA } from "./format-p1WSdr6g.mjs";
import { t as ResourceTable } from "./ResourceTable-DBMqGP3E.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/services-BsZhs8PG.js
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
			children: formatFCFA(Number(r.price))
		})
	}
];
function ServicesPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Services",
		subtitle: "Catalogue des prestations proposées au comptoir",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResourceTable, {
			table: "services",
			singular: "Service",
			plural: "Services",
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
			}
		})
	});
}
//#endregion
export { ServicesPage as component };

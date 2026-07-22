import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as AppShell } from "./AppShell-DBY349Tw.mjs";
import { r as formatFCFA, t as formatDate } from "./format-p1WSdr6g.mjs";
import { t as ResourceTable } from "./ResourceTable-BSRvee0Y.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/depenses-BnByCRPG.js
var import_jsx_runtime = require_jsx_runtime();
var fields = [
	{
		name: "category",
		label: "Catégorie",
		type: "select",
		options: [
			"Général",
			"Loyer",
			"Électricité",
			"Consommables",
			"Transport",
			"Salaires",
			"Marketing",
			"Autre"
		],
		required: true
	},
	{
		name: "amount",
		label: "Montant (FCFA)",
		type: "number",
		required: true,
		step: "1"
	},
	{
		name: "paid_at",
		label: "Date",
		type: "date",
		required: true
	},
	{
		name: "payment_method",
		label: "Mode de paiement",
		type: "select",
		options: [
			"Espèces",
			"Wave",
			"Orange Money",
			"Carte",
			"Virement"
		]
	},
	{
		name: "description",
		label: "Description",
		type: "textarea"
	}
];
var columns = [
	{
		header: "Date",
		cell: (r) => formatDate(r.paid_at)
	},
	{
		header: "Catégorie",
		cell: (r) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-xs px-2 py-1 rounded-full bg-destructive/10 text-destructive",
			children: r.category
		})
	},
	{
		header: "Description",
		cell: (r) => r.description ?? "-"
	},
	{
		header: "Mode",
		cell: (r) => r.payment_method ?? "-"
	},
	{
		header: "Montant",
		cell: (r) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
			className: "font-semibold text-destructive",
			children: ["-", formatFCFA(Number(r.amount))]
		})
	}
];
function DepensesPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Dépenses",
		subtitle: "Sorties de caisse et charges",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResourceTable, {
			table: "depenses",
			singular: "Dépense",
			plural: "Dépenses",
			fields,
			columns,
			searchFields: ["category", "description"],
			orderBy: {
				column: "paid_at",
				ascending: false
			},
			defaultValues: {
				category: "Général",
				paid_at: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10),
				payment_method: "Espèces"
			}
		})
	});
}
//#endregion
export { DepensesPage as component };

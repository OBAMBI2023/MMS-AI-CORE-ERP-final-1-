import { L as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { tt as FileText } from "../_libs/lucide-react.mjs";
import { t as useCompanySettings } from "./use-company-settings-BK0U8YkZ.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as AppShell } from "./AppShell-Ub1Z1wcC.mjs";
import { n as formatDate, t as formatCurrency } from "./format-DujI6J5F.mjs";
import { t as E } from "../_libs/jspdf.mjs";
import { n as renderDepensesTable, r as renderDepensesTotals, t as renderDepensesHeader } from "./pdf-template-engine-BTnlALPQ.mjs";
import { t as useActionPermission } from "./use-action-permission-hyj0Yfm0.mjs";
import { t as ResourceTable } from "./ResourceTable-Dm4rwXxP.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/depenses-sKyIpVI7.js
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
			children: ["-", formatCurrency(Number(r.amount))]
		})
	}
];
function DepensesPage() {
	const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
	const { settings, logoUrl } = useCompanySettings();
	const canExport = useActionPermission("depenses.export");
	const exportPDF = async (data) => {
		if (data.length === 0) {
			toast.error("Aucune dépense à exporter.");
			return;
		}
		if (!settings) {
			toast.error("Paramètres de l'entreprise non chargés.");
			return;
		}
		const doc = new E();
		const total = data.reduce((acc, d) => acc + Number(d.amount), 0);
		const startY = await renderDepensesHeader(doc, settings, logoUrl);
		renderDepensesTable(doc, data.map((d) => ({
			date: formatDate(d.paid_at),
			category: d.category,
			description: d.description,
			payment_method: d.payment_method,
			amount: formatCurrency(Number(d.amount))
		})), startY + 10);
		renderDepensesTotals(doc, formatCurrency(total), 0);
		doc.save(`Depenses_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.pdf`);
		toast.success("PDF généré.");
	};
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
				paid_at: today,
				payment_method: "Espèces"
			},
			deletePermission: "depenses.delete",
			entityName: "depenses",
			renderActions: (data) => canExport && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				onClick: () => exportPDF(data),
				className: "inline-flex items-center gap-2 rounded-xl bg-white border border-gray-300 text-gray-700 px-4 py-2 text-sm font-medium hover:text-blue-600 hover:border-blue-600 transition-colors",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-4 w-4" }), " Exporter PDF"]
			})
		})
	});
}
//#endregion
export { DepensesPage as component };

import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { L as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { K as LoaderCircle, P as Pencil, T as Search, f as Trash2, j as Plus, tt as FileText } from "../_libs/lucide-react.mjs";
import { t as logAction } from "./audit.server-AsKiprSl.mjs";
import { t as supabase } from "./client-BN74eToN.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as useCompanySettings } from "./use-company-settings-BK0U8YkZ.mjs";
import { t as usePermissions } from "./use-permissions-Bk8eXqHd.mjs";
import { n as AnimatePresence } from "../_libs/framer-motion.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as AppShell } from "./AppShell-Ub1Z1wcC.mjs";
import { r as formatDateTime, t as formatCurrency } from "./format-DujI6J5F.mjs";
import { t as LineItemsDialog } from "./LineItemsDialog-Cw7LSZFA.mjs";
import { t as autoTable } from "../_libs/jspdf-autotable.mjs";
import { t as E } from "../_libs/jspdf.mjs";
import { o as renderLogo } from "./pdf-template-engine-BTnlALPQ.mjs";
import { t as useActionPermission } from "./use-action-permission-hyj0Yfm0.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/achats-UKba012C.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
async function renderAchatsHeader(doc, settings, logoUrl, totalItems, totalAmount) {
	let startY = 10;
	if (logoUrl) {
		await renderLogo(doc, logoUrl);
		startY += 25;
	}
	doc.setFontSize(18);
	doc.setFont(void 0, "bold");
	doc.text(String(settings.company_name ?? "").toUpperCase(), 15, startY + 5);
	doc.setFontSize(14);
	doc.setFont(void 0, "normal");
	doc.text("Liste des achats", 15, startY + 12);
	doc.setFontSize(10);
	doc.text(`Date d'export : ${(/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR")}`, 15, startY + 20);
	doc.text(`Nombre d'achats : ${totalItems}`, 15, startY + 25);
	doc.text(`Montant total : ${totalAmount}`, 15, startY + 30);
	doc.setDrawColor(200, 200, 200);
	doc.setLineWidth(.5);
	doc.line(10, startY + 35, 200, startY + 35);
	return startY + 45;
}
function renderAchatsTable(doc, data, startY) {
	autoTable(doc, {
		startY,
		head: [[
			"Date",
			"Référence",
			"Fournisseur",
			"Montant"
		]],
		body: data.map((d) => [
			d.date,
			d.reference,
			d.fournisseur,
			d.amount
		]),
		theme: "striped",
		headStyles: {
			fillColor: [
				240,
				240,
				240
			],
			textColor: [
				50,
				50,
				50
			],
			fontStyle: "bold"
		},
		margin: {
			left: 10,
			right: 10
		}
	});
}
function renderAchatsTotals(doc, total) {
	const finalY = doc.lastAutoTable.finalY + 10;
	doc.setFillColor(240, 240, 240);
	doc.rect(10, finalY, 190, 10, "F");
	doc.setFontSize(12);
	doc.setFont(void 0, "bold");
	doc.text(`TOTAL DES ACHATS : ${total}`, 15, finalY + 7);
}
function AchatsPage() {
	const qc = useQueryClient();
	const [q, setQ] = (0, import_react.useState)("");
	const [editId, setEditId] = (0, import_react.useState)(null);
	const [creating, setCreating] = (0, import_react.useState)(false);
	const { settings, logoUrl } = useCompanySettings();
	const { data: userData } = useQuery({
		queryKey: ["user"],
		queryFn: () => supabase.auth.getUser()
	});
	const { roleId } = usePermissions().data || { roleId: null };
	const userId = userData?.data?.user?.id;
	const canDeleteAchat = useActionPermission("achats.delete");
	const canCreateAchat = useActionPermission("achats.create");
	const canExportAchat = useActionPermission("achats.export");
	const { data = [], isLoading } = useQuery({
		queryKey: ["achats"],
		queryFn: async () => {
			const { data, error } = await supabase.from("achats").select("*").order("created_at", { ascending: false });
			if (error) throw error;
			return data ?? [];
		}
	});
	const exportPDF = async (data) => {
		if (data.length === 0) {
			toast.error("Aucun achat à exporter.");
			return;
		}
		if (!settings) {
			toast.error("Paramètres de l'entreprise non chargés.");
			return;
		}
		const doc = new E();
		const total = data.reduce((acc, d) => acc + Number(d.total), 0);
		const startY = await renderAchatsHeader(doc, settings, logoUrl, data.length, formatCurrency(total));
		renderAchatsTable(doc, data.map((d) => ({
			date: formatDateTime(d.created_at),
			reference: d.number,
			fournisseur: d.fournisseur_name ?? "-",
			amount: formatCurrency(Number(d.total))
		})), startY + 5);
		renderAchatsTotals(doc, formatCurrency(total));
		doc.save(`Achats_${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.pdf`);
		toast.success("PDF généré.");
	};
	const del = useMutation({
		mutationFn: async (achat) => {
			const { error } = await supabase.from("achats").delete().eq("id", achat.id);
			if (error) throw error;
			return achat;
		},
		onSuccess: async (achat) => {
			if (userId) await logAction(userId, roleId, "delete", "achats", { achat_number: achat.number });
			toast.success("Achat supprimé");
			qc.invalidateQueries({ queryKey: ["achats"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const filtered = data.filter((d) => !q || (d.number ?? "").toLowerCase().includes(q.toLowerCase()) || (d.fournisseur_name ?? "").toLowerCase().includes(q.toLowerCase()));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Achats",
		subtitle: "Approvisionnements et commandes fournisseurs",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex-1 max-w-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: q,
						onChange: (e) => setQ(e.target.value),
						placeholder: "Rechercher un achat...",
						className: "w-full rounded-xl bg-muted/60 border border-border pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/40"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2 ml-auto",
					children: [canExportAchat && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => exportPDF(filtered),
						className: "inline-flex items-center gap-2 rounded-xl bg-white border border-gray-300 text-gray-700 px-4 py-2 text-sm font-medium hover:text-blue-600 hover:border-blue-600 transition-colors",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-4 w-4" }), " Exporter PDF"]
					}), canCreateAchat && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setCreating(true),
						className: "inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " Nouvel achat"]
					})]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-2xl border border-border bg-card overflow-x-auto w-full",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-sm min-w-max",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "text-left px-4 py-3 font-medium",
								children: "Numéro"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "text-left px-4 py-3 font-medium",
								children: "Fournisseur"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "text-left px-4 py-3 font-medium",
								children: "Date"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "text-right px-4 py-3 font-medium",
								children: "Total"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "w-24" })
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						colSpan: 5,
						className: "text-center py-12",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-5 w-5 animate-spin mx-auto text-muted-foreground" })
					}) }) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						colSpan: 5,
						className: "text-center py-12 text-muted-foreground",
						children: [
							"Aucun achat ",
							q ? "trouvé" : "pour l'instant",
							"."
						]
					}) }) : filtered.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border hover:bg-muted/30",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3 font-medium",
								children: d.number
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3",
								children: d.fournisseur_name ?? "-"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3 text-muted-foreground text-xs",
								children: formatDateTime(d.created_at)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3 text-right font-semibold text-primary",
								children: formatCurrency(Number(d.total))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-end gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => setEditId(d.id),
										className: "p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
									}), canDeleteAchat && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										onClick: () => confirm("Supprimer cet achat ?") && del.mutate(d),
										className: "p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
									})]
								})
							})
						]
					}, d.id)) })]
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: (creating || editId) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LineItemsDialog, {
			headerTable: "achats",
			itemsTable: "achat_items",
			fkColumn: "achat_id",
			partnerTable: "fournisseurs",
			partnerLabel: "Fournisseur",
			numberPrefix: "ACH",
			singular: "Achat",
			initialId: editId,
			onClose: () => {
				setEditId(null);
				setCreating(false);
			}
		}) })]
	});
}
//#endregion
export { AchatsPage as component };

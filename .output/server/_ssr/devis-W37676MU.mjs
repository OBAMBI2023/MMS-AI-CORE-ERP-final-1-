import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { H as LoaderCircle, O as Plus, S as Search, Z as FileDown, f as Trash2, j as Pencil } from "../_libs/lucide-react.mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as useCompanySettings } from "./use-company-settings-X3aX6rL8.mjs";
import { n as AnimatePresence } from "../_libs/framer-motion.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as AppShell } from "./AppShell-qhFbzIp3.mjs";
import { r as formatFCFA, t as formatDate } from "./format-p1WSdr6g.mjs";
import { t as LineItemsDialog } from "./LineItemsDialog-Bbfikd_r.mjs";
import { t as E } from "../_libs/jspdf.mjs";
import "../_libs/jspdf-autotable.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/devis-W37676MU.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function generateDevisPDF(quote, settings) {
	const doc = new E();
	doc.setFontSize(20);
	doc.text(settings.companyName, 10, 20);
	doc.setFontSize(10);
	doc.text(settings.activity, 10, 26);
	doc.text(`${settings.address}, ${settings.city}, ${settings.country}`, 10, 31);
	doc.text(`Tél: ${settings.phone} | Email: ${settings.email}`, 10, 36);
	doc.text(`RCCM: ${settings.rccm} | CC: ${settings.cc} | IFU: ${settings.ifu}`, 10, 41);
	doc.setFontSize(16);
	doc.text("DEVIS", 105, 60, { align: "center" });
	doc.setFontSize(10);
	doc.text(`Numéro: ${quote.number}`, 105, 66, { align: "center" });
	doc.text(`Date: ${quote.creationDate} | Expiration: ${quote.expirationDate}`, 105, 71, { align: "center" });
	doc.text("Informations du client:", 10, 90);
	doc.text(quote.clientName, 10, 95);
	doc.text(quote.company, 10, 100);
	doc.text(quote.phone, 10, 105);
	doc.text(quote.email, 10, 110);
	doc.autoTable({
		startY: 120,
		head: [[
			"Description",
			"Qté",
			"Prix U.",
			"Remise",
			"TVA",
			"Montant"
		]],
		body: quote.items.map((item) => [
			item.description,
			item.quantity.toString(),
			item.unitPrice.toString(),
			item.discount.toString(),
			item.tax.toString(),
			item.amount.toString()
		])
	});
	const finalY = doc.lastAutoTable.finalY + 10;
	doc.text(`Sous-total: ${quote.totals.subTotal}`, 150, finalY);
	doc.text(`Remise: ${quote.totals.discount}`, 150, finalY + 5);
	doc.text(`TVA: ${quote.totals.tax}`, 150, finalY + 10);
	doc.setFontSize(12);
	doc.text(`Total TTC: ${quote.totals.totalTTC}`, 150, finalY + 15);
	doc.save(`Devis_${quote.number}.pdf`);
}
var STATUSES = [
	"brouillon",
	"envoyé",
	"accepté",
	"refusé"
];
var statusColor = {
	brouillon: "bg-muted text-muted-foreground",
	envoyé: "bg-primary/10 text-primary",
	accepté: "bg-emerald-500/15 text-emerald-600",
	refusé: "bg-destructive/10 text-destructive"
};
function DevisPage() {
	const { settings } = useCompanySettings();
	const qc = useQueryClient();
	const [q, setQ] = (0, import_react.useState)("");
	const [editId, setEditId] = (0, import_react.useState)(null);
	const [creating, setCreating] = (0, import_react.useState)(false);
	const downloadPDF = async (devis) => {
		const { data: items, error } = await supabase.from("devis_items").select("*").eq("devis_id", devis.id);
		if (error) {
			toast.error("Erreur chargement items");
			return;
		}
		generateDevisPDF({
			number: devis.number,
			creationDate: new Date(devis.created_at).toLocaleDateString(),
			expirationDate: devis.due_date ? new Date(devis.due_date).toLocaleDateString() : "",
			status: devis.status,
			clientName: devis.client_name ?? "",
			company: "",
			phone: "",
			email: "",
			address: "",
			items: (items ?? []).map((i) => ({
				description: i.name,
				quantity: i.qty,
				unitPrice: i.price,
				discount: 0,
				tax: 0,
				amount: i.line_total
			})),
			totals: {
				subTotal: devis.total,
				discount: 0,
				tax: 0,
				totalTTC: devis.total
			}
		}, {
			companyName: settings?.company_name ?? "",
			activity: settings?.activity ?? "",
			address: settings?.address ?? "",
			city: settings?.city ?? "",
			country: settings?.country ?? "",
			phone: settings?.phone ?? "",
			email: settings?.email ?? "",
			website: settings?.website ?? "",
			rccm: settings?.rccm ?? "",
			cc: settings?.cc ?? "",
			ifu: settings?.ifu ?? "",
			managerName: settings?.manager_name ?? "",
			managerTitle: settings?.manager_title ?? ""
		});
	};
	const { data = [], isLoading } = useQuery({
		queryKey: ["devis"],
		queryFn: async () => {
			const { data, error } = await supabase.from("devis").select("*").order("created_at", { ascending: false });
			if (error) throw error;
			return data ?? [];
		}
	});
	const del = useMutation({
		mutationFn: async (id) => {
			const { error } = await supabase.from("devis").delete().eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Devis supprimé");
			qc.invalidateQueries({ queryKey: ["devis"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const setStatus = useMutation({
		mutationFn: async (v) => {
			const { error } = await supabase.from("devis").update({ status: v.status }).eq("id", v.id);
			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["devis"] }),
		onError: (e) => toast.error(e.message)
	});
	const filtered = data.filter((d) => !q || (d.number ?? "").toLowerCase().includes(q.toLowerCase()) || (d.client_name ?? "").toLowerCase().includes(q.toLowerCase()));
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Devis",
		subtitle: "Propositions commerciales et suivi",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex-1 max-w-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: q,
						onChange: (e) => setQ(e.target.value),
						placeholder: "Rechercher un devis...",
						className: "w-full rounded-xl bg-muted/60 border border-border pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/40"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
					onClick: () => setCreating(true),
					className: "ml-auto inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }), " Nouveau devis"]
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
								children: "Client"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "text-left px-4 py-3 font-medium",
								children: "Échéance"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "text-left px-4 py-3 font-medium",
								children: "Statut"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "text-right px-4 py-3 font-medium",
								children: "Total"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "w-24" })
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						colSpan: 6,
						className: "text-center py-12",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-5 w-5 animate-spin mx-auto text-muted-foreground" })
					}) }) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						colSpan: 6,
						className: "text-center py-12 text-muted-foreground",
						children: [
							"Aucun devis ",
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
								children: d.client_name ?? "-"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3 text-muted-foreground",
								children: formatDate(d.due_date)
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("select", {
									value: d.status,
									onChange: (e) => setStatus.mutate({
										id: d.id,
										status: e.target.value
									}),
									className: `text-xs px-2 py-1 rounded-full font-medium border-0 outline-none cursor-pointer ${statusColor[d.status] ?? ""}`,
									children: STATUSES.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
										value: s,
										children: s
									}, s))
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3 text-right font-semibold text-primary",
								children: formatFCFA(Number(d.total))
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "px-4 py-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-end gap-1",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => downloadPDF(d),
											className: "p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-primary",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "h-4 w-4" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => setEditId(d.id),
											className: "p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											onClick: () => confirm("Supprimer ce devis ?") && del.mutate(d.id),
											className: "p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
										})
									]
								})
							})
						]
					}, d.id)) })]
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: (creating || editId) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LineItemsDialog, {
			headerTable: "devis",
			itemsTable: "devis_items",
			fkColumn: "devis_id",
			partnerTable: "clients",
			partnerLabel: "Client",
			numberPrefix: "DEV",
			singular: "Devis",
			extraFields: [{
				name: "status",
				label: "Statut",
				type: "select",
				options: [...STATUSES]
			}, {
				name: "due_date",
				label: "Échéance",
				type: "date"
			}],
			initialId: editId,
			onClose: () => {
				setEditId(null);
				setCreating(false);
			}
		}) })]
	});
}
//#endregion
export { DevisPage as component };

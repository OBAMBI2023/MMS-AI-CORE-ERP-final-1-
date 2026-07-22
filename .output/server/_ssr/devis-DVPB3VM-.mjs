import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { H as LoaderCircle, O as Plus, S as Search, Z as FileDown, d as Trash2, j as Pencil } from "../_libs/lucide-react.mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as useCompanySettings } from "./use-company-settings-Bqa94T5s.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { t as Button } from "./button-Bq5vK6RO.mjs";
import { n as AnimatePresence } from "../_libs/framer-motion.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as AppShell } from "./AppShell-DBY349Tw.mjs";
import { r as formatFCFA, t as formatDate } from "./format-p1WSdr6g.mjs";
import { t as LineItemsDialog } from "./LineItemsDialog-Bbfikd_r.mjs";
import { t as E } from "../_libs/jspdf.mjs";
import { t as autoTable } from "../_libs/jspdf-autotable.mjs";
import { a as Trigger, i as Root3, n as Portal, r as Provider, t as Content2 } from "../_libs/radix-ui__react-tooltip.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/devis-DVPB3VM-.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
async function urlToDataURL(url) {
	const blob = await (await fetch(url)).blob();
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => resolve(reader.result);
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
}
async function renderLogo(doc, logoUrl) {
	try {
		const dataUrl = await urlToDataURL(logoUrl);
		doc.addImage(dataUrl, "PNG", 10, 10, 50, 20);
	} catch (error) {
		console.error("Failed to render logo:", error);
	}
}
async function renderSignatureAndStamp(doc, signatureUrl, cachetUrl) {
	try {
		const x = 140;
		const y = doc.internal.pageSize.height - 50;
		const width = 50;
		const height = 30;
		const signatureData = await urlToDataURL(signatureUrl);
		doc.addImage(signatureData, "PNG", x, y, width, height);
		if (cachetUrl) {
			const cachetData = await urlToDataURL(cachetUrl);
			doc.saveGraphicsState();
			doc.setGState(new E.GState({ opacity: .75 }));
			doc.addImage(cachetData, "PNG", x, y, width, height);
			doc.restoreGraphicsState();
		}
	} catch (error) {
		console.error("Failed to render signature/stamp:", error);
	}
}
function renderHeader(doc, settings, startY = 10) {
	doc.setTextColor(37, 99, 235);
	doc.setFontSize(22);
	doc.setFont(void 0, "bold");
	doc.text(String(settings.company_name ?? "").toUpperCase(), 200, startY + 10, { align: "right" });
	doc.setFontSize(10);
	doc.setFont(void 0, "normal");
	doc.setTextColor(50, 50, 50);
	doc.text(String(settings.trade_name ?? ""), 200, startY + 16, { align: "right" });
	doc.text(`${String(settings.address ?? "")}, ${String(settings.city ?? "")}`, 200, startY + 22, { align: "right" });
	doc.text(`Tél: ${String(settings.phone ?? "")} | Email: ${String(settings.email ?? "")}`, 200, startY + 28, { align: "right" });
	doc.setDrawColor(200, 200, 200);
	doc.setLineWidth(.5);
	doc.line(10, startY + 32, 200, startY + 32);
	return startY + 40;
}
function renderFooter(doc, settings) {
	const pageCount = doc.internal.getNumberOfPages();
	for (let i = 1; i <= pageCount; i++) {
		doc.setPage(i);
		doc.setFontSize(8);
		doc.setTextColor(100, 116, 139);
		doc.text(`Page ${i} de ${pageCount} - ${settings.company_name}`, doc.internal.pageSize.width / 2, doc.internal.pageSize.height - 10, { align: "center" });
	}
}
function renderTable(doc, items, startY) {
	autoTable(doc, {
		startY,
		head: [[
			"Description",
			"Qté",
			"Prix U.",
			"Remise",
			"TVA",
			"Montant"
		]],
		body: items.map((item) => [
			item.description,
			item.quantite.toString(),
			item.prixUnitaire.toString(),
			item.remise.toString(),
			item.tva.toString(),
			item.montant.toString()
		]),
		theme: "plain",
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
			fontStyle: "bold",
			lineWidth: .1,
			lineColor: [
				200,
				200,
				200
			]
		},
		bodyStyles: {
			lineWidth: .1,
			lineColor: [
				220,
				220,
				220
			]
		},
		margin: {
			left: 10,
			right: 10
		}
	});
}
function renderTotals(doc, totals, startY) {
	const rightMargin = 200;
	doc.setFillColor(245, 245, 245);
	doc.rect(130, startY - 5, 75, 25, "F");
	doc.setFontSize(10);
	doc.setTextColor(50, 50, 50);
	doc.text(`Sous-total: ${totals.sousTotal}`, rightMargin - 5, startY, { align: "right" });
	doc.text(`Remise: ${totals.remise}`, rightMargin - 5, startY + 5, { align: "right" });
	doc.text(`TVA: ${totals.tva}`, rightMargin - 5, startY + 10, { align: "right" });
	doc.setFontSize(12);
	doc.setFont(void 0, "bold");
	doc.setTextColor(37, 99, 235);
	doc.text(`Total TTC: ${totals.totalTTC}`, rightMargin - 5, startY + 18, { align: "right" });
	doc.setFont(void 0, "normal");
	doc.setTextColor(50, 50, 50);
}
async function generateDevisPDF(quote, settings, images = {}) {
	try {
		if (!quote || !quote.numero || !quote.items || quote.items.length === 0) {
			toast.error("Données du devis incomplètes pour la génération du PDF.");
			return;
		}
		const doc = new E();
		let afterHeaderY = renderHeader(doc, settings);
		if (images.logo) await renderLogo(doc, images.logo);
		doc.setFontSize(16);
		doc.setTextColor(0, 0, 0);
		doc.text("DEVIS", 105, afterHeaderY + 10, { align: "center" });
		doc.setFontSize(10);
		doc.text(`Numéro: ${quote.numero}`, 105, afterHeaderY + 16, { align: "center" });
		doc.text(`Date: ${quote.date} | Expiration: ${quote.dateExpiration}`, 105, afterHeaderY + 21, { align: "center" });
		doc.text("Informations du client:", 10, afterHeaderY + 35);
		doc.text(quote.client.nom, 10, afterHeaderY + 40);
		if (quote.client.entreprise) doc.text(quote.client.entreprise, 10, afterHeaderY + 45);
		if (quote.client.telephone) doc.text(quote.client.telephone, 10, afterHeaderY + 50);
		if (quote.client.email) doc.text(quote.client.email, 10, afterHeaderY + 55);
		renderTable(doc, quote.items, afterHeaderY + 65);
		const finalY = doc.lastAutoTable.finalY + 10;
		renderTotals(doc, quote.totals, finalY);
		if (images.signature) await renderSignatureAndStamp(doc, images.signature, images.cachet || null);
		renderFooter(doc, settings);
		const filename = `DEV-${(/* @__PURE__ */ new Date()).toISOString().split("T")[0].replace(/-/g, "")}-${quote.numero}.pdf`;
		doc.save(filename);
		toast.success("PDF généré avec succès.");
	} catch (error) {
		console.error("PDF generation failed:", error);
		toast.error("Erreur lors de la génération du PDF.");
	}
}
var TooltipProvider = Provider;
var Tooltip = Root3;
var TooltipTrigger = Trigger;
var TooltipContent = import_react.forwardRef(({ className, sideOffset = 4, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Portal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	sideOffset,
	className: cn("z-50 overflow-hidden rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-tooltip-content-transform-origin)", className),
	...props
}) }));
TooltipContent.displayName = Content2.displayName;
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
		if (!settings) {
			toast.error("Paramètres entreprise manquants");
			return;
		}
		const getUrl = async (path) => {
			if (!path) return null;
			const { data } = await supabase.storage.from("company-assets").createSignedUrl(path, 3600);
			return data?.signedUrl ?? null;
		};
		const logoUrl = await getUrl(settings.logo_url);
		const signatureUrl = await getUrl(settings.signature_url);
		const cachetUrl = await getUrl(settings.cachet_url);
		await generateDevisPDF({
			numero: devis.number,
			date: new Date(devis.created_at).toLocaleDateString(),
			dateExpiration: devis.due_date ? new Date(devis.due_date).toLocaleDateString() : "",
			statut: devis.status,
			client: { nom: devis.client_name ?? "Client inconnu" },
			items: (items ?? []).map((i) => ({
				description: i.name,
				quantite: i.qty,
				prixUnitaire: i.price,
				remise: 0,
				tva: 0,
				montant: i.price * i.qty
			})),
			totals: {
				sousTotal: devis.subtotal ?? 0,
				remise: devis.discount ?? 0,
				tva: (devis.total ?? 0) - (devis.subtotal ?? 0),
				totalTTC: devis.total ?? 0
			},
			conditionsPaiement: "À réception"
		}, settings, {
			logo: logoUrl,
			signature: signatureUrl,
			cachet: cachetUrl
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipProvider, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
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
										/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tooltip, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipTrigger, {
											asChild: true,
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
												size: "sm",
												variant: "outline",
												className: "bg-[#2563EB] text-white hover:bg-[#2563EB]/90",
												onClick: () => downloadPDF(d),
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileDown, { className: "h-4 w-4 mr-2" }), " PDF"]
											})
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TooltipContent, { children: "Télécharger le devis" })] }),
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
	}) });
}
//#endregion
export { DevisPage as component };

import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { J as FileText, h as ShoppingCart, i as Users, l as TrendingUp, r as Wallet, u as TrendingDown } from "../_libs/lucide-react.mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as AppShell } from "./AppShell-B_T5tO-_.mjs";
import { r as formatFCFA } from "./format-p1WSdr6g.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rapports-CvptM9sT.js
var import_jsx_runtime = require_jsx_runtime();
function useStats() {
	return useQuery({
		queryKey: ["stats"],
		queryFn: async () => {
			const [ventes, depenses, achats, devis, clients, fourns] = await Promise.all([
				supabase.from("ventes").select("total, created_at"),
				supabase.from("depenses").select("amount, paid_at"),
				supabase.from("achats").select("total, created_at"),
				supabase.from("devis").select("id, status, total"),
				supabase.from("clients").select("id", {
					count: "exact",
					head: true
				}),
				supabase.from("fournisseurs").select("id", {
					count: "exact",
					head: true
				})
			]);
			const now = /* @__PURE__ */ new Date();
			const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
			const inMonth = (d) => new Date(d) >= mStart;
			const sumV = (ventes.data ?? []).reduce((s, r) => s + Number(r.total), 0);
			const sumVMonth = (ventes.data ?? []).filter((r) => inMonth(r.created_at)).reduce((s, r) => s + Number(r.total), 0);
			const sumD = (depenses.data ?? []).reduce((s, r) => s + Number(r.amount), 0);
			const sumDMonth = (depenses.data ?? []).filter((r) => inMonth(r.paid_at)).reduce((s, r) => s + Number(r.amount), 0);
			const sumA = (achats.data ?? []).reduce((s, r) => s + Number(r.total), 0);
			const devisAccepte = (devis.data ?? []).filter((d) => d.status === "accepté").length;
			const devisEnAttente = (devis.data ?? []).filter((d) => d.status === "brouillon" || d.status === "envoyé").length;
			return {
				ventesTotal: sumV,
				ventesMois: sumVMonth,
				depensesTotal: sumD,
				depensesMois: sumDMonth,
				achatsTotal: sumA,
				beneficeMois: sumVMonth - sumDMonth,
				devisAccepte,
				devisEnAttente,
				devisTotal: (devis.data ?? []).length,
				nbClients: clients.count ?? 0,
				nbFournisseurs: fourns.count ?? 0
			};
		}
	});
}
function RapportsPage() {
	const { data, isLoading } = useStats();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Rapports",
		subtitle: "Vue d'ensemble de l'activité",
		children: isLoading || !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-muted-foreground",
			children: "Chargement..."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						icon: Wallet,
						label: "Ventes du mois",
						value: formatFCFA(data.ventesMois),
						accent: "text-primary"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						icon: TrendingDown,
						label: "Dépenses du mois",
						value: formatFCFA(data.depensesMois),
						accent: "text-destructive"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						icon: TrendingUp,
						label: "Bénéfice net (mois)",
						value: formatFCFA(data.beneficeMois),
						accent: data.beneficeMois >= 0 ? "text-emerald-600" : "text-destructive"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						icon: ShoppingCart,
						label: "Achats cumulés",
						value: formatFCFA(data.achatsTotal),
						accent: "text-foreground"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-3 gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniCard, {
						title: "Devis",
						items: [
							{
								label: "Total",
								value: String(data.devisTotal)
							},
							{
								label: "Acceptés",
								value: String(data.devisAccepte)
							},
							{
								label: "En attente",
								value: String(data.devisEnAttente)
							}
						],
						icon: FileText
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniCard, {
						title: "Clients & Fournisseurs",
						items: [{
							label: "Clients",
							value: String(data.nbClients)
						}, {
							label: "Fournisseurs",
							value: String(data.nbFournisseurs)
						}],
						icon: Users
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MiniCard, {
						title: "Cumul global",
						items: [{
							label: "Ventes",
							value: formatFCFA(data.ventesTotal)
						}, {
							label: "Dépenses",
							value: formatFCFA(data.depensesTotal)
						}],
						icon: TrendingUp
					})
				]
			})]
		})
	});
}
function StatCard({ icon: Icon, label, value, accent }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "rounded-2xl border border-border bg-card p-5",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-start justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-xs text-muted-foreground uppercase tracking-wide",
				children: label
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: `text-2xl font-bold mt-2 ${accent}`,
				children: value
			})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
			})]
		})
	});
}
function MiniCard({ title, items, icon: Icon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card p-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 mb-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-4 w-4 text-primary" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-semibold text-sm",
				children: title
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-2",
			children: items.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-muted-foreground",
					children: i.label
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "font-semibold",
					children: i.value
				})]
			}, i.label))
		})]
	});
}
//#endregion
export { RapportsPage as component };

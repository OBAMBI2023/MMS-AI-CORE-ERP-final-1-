import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { l as TrendingUp, u as TrendingDown } from "../_libs/lucide-react.mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as AppShell } from "./AppShell-CIKwWu5C.mjs";
import { r as formatFCFA } from "./format-p1WSdr6g.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-DUy71i1r.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rapports-CCs42KM5.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function useData() {
	return useQuery({
		queryKey: ["stats-data"],
		queryFn: async () => {
			const [ventes, depenses, achats, devis, clients] = await Promise.all([
				supabase.from("ventes").select("total, created_at"),
				supabase.from("depenses").select("amount, paid_at"),
				supabase.from("achats").select("total, created_at"),
				supabase.from("devis").select("id, status, total, created_at"),
				supabase.from("clients").select("id, created_at")
			]);
			return {
				ventes: ventes.data ?? [],
				depenses: depenses.data ?? [],
				achats: achats.data ?? [],
				devis: devis.data ?? [],
				clients: clients.data ?? []
			};
		}
	});
}
function RapportsPage() {
	const { data, isLoading } = useData();
	const [month, setMonth] = (0, import_react.useState)((/* @__PURE__ */ new Date()).getMonth() + 1);
	const [year, setYear] = (0, import_react.useState)((/* @__PURE__ */ new Date()).getFullYear());
	const stats = (0, import_react.useMemo)(() => {
		if (!data) return null;
		const getStats = (m, y) => {
			const filtered = {
				ventes: data.ventes.filter((v) => new Date(v.created_at).getMonth() + 1 === m && new Date(v.created_at).getFullYear() === y),
				depenses: data.depenses.filter((d) => new Date(d.paid_at).getMonth() + 1 === m && new Date(d.paid_at).getFullYear() === y),
				achats: data.achats.filter((a) => new Date(a.created_at).getMonth() + 1 === m && new Date(a.created_at).getFullYear() === y),
				devis: data.devis.filter((d) => new Date(d.created_at).getMonth() + 1 === m && new Date(d.created_at).getFullYear() === y),
				clients: data.clients.filter((c) => new Date(c.created_at).getMonth() + 1 === m && new Date(c.created_at).getFullYear() === y)
			};
			const sumV = filtered.ventes.reduce((s, r) => s + Number(r.total), 0);
			const sumD = filtered.depenses.reduce((s, r) => s + Number(r.amount), 0);
			const sumA = filtered.achats.reduce((s, r) => s + Number(r.total), 0);
			return {
				ventes: sumV,
				ventesCount: filtered.ventes.length,
				depenses: sumD,
				achats: sumA,
				benefice: sumV - sumD,
				devisCount: filtered.devis.length,
				clientsCount: filtered.clients.length
			};
		};
		const target = getStats(month, year);
		const prevMonth = month === 1 ? getStats(12, year - 1) : getStats(month - 1, year);
		const prevYearSameMonth = getStats(month, year - 1);
		const compare = (targetVal, compareVal) => {
			const diff = targetVal - compareVal;
			return {
				diff,
				pct: compareVal === 0 ? 0 : diff / compareVal * 100
			};
		};
		return {
			target,
			vsPrev: {
				ventes: compare(target.ventes, prevMonth.ventes),
				ventesCount: compare(target.ventesCount, prevMonth.ventesCount),
				devisCount: compare(target.devisCount, prevMonth.devisCount),
				depenses: compare(target.depenses, prevMonth.depenses),
				achats: compare(target.achats, prevMonth.achats),
				benefice: compare(target.benefice, prevMonth.benefice),
				clientsCount: compare(target.clientsCount, prevMonth.clientsCount)
			},
			vsPrevYear: { ventes: compare(target.ventes, prevYearSameMonth.ventes) }
		};
	}, [
		data,
		month,
		year
	]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Rapports",
		subtitle: "Vue d'ensemble de l'activité",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex gap-4 mb-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
				value: String(month),
				onValueChange: (v) => setMonth(Number(v)),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
					className: "w-[180px]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Mois" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: Array.from({ length: 12 }, (_, i) => i + 1).map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
					value: String(m),
					children: new Date(0, m - 1).toLocaleString("fr-FR", { month: "long" })
				}, m)) })]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
				value: String(year),
				onValueChange: (v) => setYear(Number(v)),
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
					className: "w-[180px]",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Année" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: [...Array(5)].map((_, i) => (/* @__PURE__ */ new Date()).getFullYear() - i).map((y) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
					value: String(y),
					children: y
				}, y)) })]
			})]
		}), isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-muted-foreground",
			children: "Chargement..."
		}) : !stats ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-muted-foreground",
			children: "Aucune donnée disponible."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Chiffre d'affaires",
						value: stats.target.ventes,
						compare: stats.vsPrev.ventes
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Nombre de ventes",
						value: stats.target.ventesCount,
						compare: stats.vsPrev.ventesCount
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Nombre de devis",
						value: stats.target.devisCount,
						compare: stats.vsPrev.devisCount
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Dépenses",
						value: stats.target.depenses,
						compare: stats.vsPrev.depenses
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Achats",
						value: stats.target.achats,
						compare: stats.vsPrev.achats
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Bénéfice",
						value: stats.target.benefice,
						compare: stats.vsPrev.benefice
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Nouveaux clients",
						value: stats.target.clientsCount,
						compare: stats.vsPrev.clientsCount
					})
				]
			})
		})]
	});
}
function StatCard({ label, value, compare }) {
	const isCurrency = [
		"Chiffre d'affaires",
		"Dépenses",
		"Achats",
		"Bénéfice"
	].includes(label);
	const formattedValue = isCurrency ? formatFCFA(value) : value;
	const formattedDiff = isCurrency ? formatFCFA(Math.abs(compare.diff)) : Math.abs(compare.diff);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "rounded-2xl border border-border bg-card p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm text-muted-foreground",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-2xl font-bold mt-1",
				children: formattedValue
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: `text-sm mt-2 flex items-center gap-1 ${compare.diff >= 0 ? "text-emerald-600" : "text-destructive"}`,
				children: [compare.diff >= 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingUp, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TrendingDown, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: [
					compare.diff >= 0 ? "+" : "",
					formattedDiff,
					" (",
					compare.pct.toFixed(1),
					"%)"
				] })]
			})
		]
	});
}
//#endregion
export { RapportsPage as component };

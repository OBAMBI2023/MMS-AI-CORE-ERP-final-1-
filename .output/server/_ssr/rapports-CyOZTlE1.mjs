import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { Y as FileText, a as Users, f as Sun, g as ShoppingCart, i as Wallet, pt as ChartColumn, tt as Download } from "../_libs/lucide-react.mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as Button } from "./button-Bq5vK6RO.mjs";
import { t as motion } from "../_libs/framer-motion.mjs";
import { t as AppShell } from "./AppShell-DBY349Tw.mjs";
import { r as formatFCFA } from "./format-p1WSdr6g.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { a as YAxis, c as Line, d as Pie, f as Cell, h as Legend, i as LineChart, l as CartesianGrid, m as Tooltip, n as PieChart, o as XAxis, p as ResponsiveContainer } from "../_libs/recharts+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/rapports-CyOZTlE1.js
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
	const START_YEAR = 2022;
	const [year, setYear] = (0, import_react.useState)(Math.min((/* @__PURE__ */ new Date()).getFullYear(), 2030));
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
				depenses: compare(target.depenses, prevMonth.depenses),
				achats: compare(target.achats, prevMonth.achats),
				benefice: compare(target.benefice, prevMonth.benefice),
				devisCount: compare(target.devisCount, prevMonth.devisCount),
				clientsCount: compare(target.clientsCount, prevMonth.clientsCount)
			}
		};
	}, [
		data,
		month,
		year
	]);
	const chartData = [
		{
			name: "Jan",
			sales: 4e3
		},
		{
			name: "Fév",
			sales: 3e3
		},
		{
			name: "Mar",
			sales: 2e3
		},
		{
			name: "Avr",
			sales: 2780
		},
		{
			name: "Mai",
			sales: 1890
		},
		{
			name: "Juin",
			sales: 2390
		}
	];
	const pieData = [
		{
			name: "Ventes",
			value: stats?.target.ventes || 0
		},
		{
			name: "Achats",
			value: stats?.target.achats || 0
		},
		{
			name: "Dépenses",
			value: stats?.target.depenses || 0
		},
		{
			name: "Devis",
			value: stats?.target.devisCount || 0
		},
		{
			name: "Clients",
			value: stats?.target.clientsCount || 0
		}
	];
	const COLORS = [
		"#0088FE",
		"#00C49F",
		"#FFBB28",
		"#FF8042",
		"#8884d8"
	];
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AppShell, {
		title: "Rapports",
		subtitle: "Vue d'ensemble de l'activité",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center justify-between mb-8",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: String(month),
					onValueChange: (v) => setMonth(Number(v)),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
						className: "w-[180px] rounded-xl",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Mois" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: Array.from({ length: 12 }, (_, i) => i + 1).map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: String(m),
						children: new Date(0, m - 1).toLocaleString("fr-FR", { month: "long" })
					}, m)) })]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
					value: String(year),
					onValueChange: (v) => setYear(Number(v)),
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
						className: "w-[180px] rounded-xl",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Année" })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: Array.from({ length: 9 }, (_, i) => START_YEAR + i).map((y) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
						value: String(y),
						children: y
					}, y)) })]
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					size: "icon",
					className: "rounded-xl",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "h-4 w-4" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					className: "rounded-xl gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4" }), " Exporter"]
				})]
			})]
		}), isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-muted-foreground",
			children: "Chargement..."
		}) : !stats ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "text-muted-foreground",
			children: "Aucune donnée disponible."
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-8",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Chiffre d'affaires",
						value: stats.target.ventes,
						compare: stats.vsPrev.ventes,
						icon: Wallet,
						color: "text-blue-500"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Nombre de devis",
						value: stats.target.devisCount,
						compare: stats.vsPrev.devisCount,
						icon: FileText,
						color: "text-orange-500"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Dépenses",
						value: stats.target.depenses,
						compare: stats.vsPrev.depenses,
						icon: ShoppingCart,
						color: "text-red-500"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Achats",
						value: stats.target.achats,
						compare: stats.vsPrev.achats,
						icon: ShoppingCart,
						color: "text-green-500"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Bénéfice",
						value: stats.target.benefice,
						compare: stats.vsPrev.benefice,
						icon: ChartColumn,
						color: "text-indigo-500"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatCard, {
						label: "Nouveaux clients",
						value: stats.target.clientsCount,
						compare: stats.vsPrev.clientsCount,
						icon: Users,
						color: "text-purple-500"
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 lg:grid-cols-2 gap-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-border bg-card p-6 shadow-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-lg font-semibold mb-4",
						children: "Évolution Chiffre d'affaires"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-[300px]",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
								data: chartData,
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
										strokeDasharray: "3 3",
										vertical: false
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, { dataKey: "name" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
										type: "monotone",
										dataKey: "sales",
										stroke: "#0088FE",
										strokeWidth: 3,
										dot: { r: 4 },
										activeDot: { r: 6 }
									})
								]
							})
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "rounded-2xl border border-border bg-card p-6 shadow-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "text-lg font-semibold mb-4",
						children: "Répartition Activité"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-[300px] flex items-center justify-center",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
							width: "100%",
							height: "100%",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PieChart, { children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pie, {
									data: pieData,
									dataKey: "value",
									nameKey: "name",
									cx: "50%",
									cy: "50%",
									innerRadius: 60,
									outerRadius: 80,
									paddingAngle: 5,
									children: pieData.map((entry, index) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { fill: COLORS[index % COLORS.length] }, `cell-${index}`))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, {})
							] })
						})
					})]
				})]
			})]
		})]
	});
}
function StatCard({ label, value, compare, icon: Icon, color }) {
	const isCurrency = [
		"Chiffre d'affaires",
		"Dépenses",
		"Achats",
		"Bénéfice"
	].includes(label);
	const formattedValue = isCurrency ? formatFCFA(value) : value;
	isCurrency ? formatFCFA(Math.abs(compare.diff)) : Math.abs(compare.diff);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
		whileHover: { y: -5 },
		className: "rounded-2xl border border-border bg-card p-5 shadow-sm",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between mb-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: `p-2 rounded-full bg-slate-100 ${color}`,
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: `text-xs font-medium ${compare.diff >= 0 ? "text-emerald-600" : "text-destructive"}`,
					children: [
						compare.diff >= 0 ? "+" : "",
						compare.pct.toFixed(1),
						"%"
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-sm text-muted-foreground",
				children: label
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-2xl font-bold mt-1",
				children: formattedValue
			})
		]
	});
}
//#endregion
export { RapportsPage as component };

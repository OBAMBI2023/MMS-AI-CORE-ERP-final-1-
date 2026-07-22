import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { g as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { B as LogIn, E as Receipt, N as Package, O as Plus, P as Minus, Y as FileText, _ as ShoppingBag, _t as ArrowUpRight, a as Users, at as Clock, g as ShoppingCart, i as Wallet, l as Truck, mt as Building2, pt as ChartColumn, r as Wrench, rt as CreditCard, s as UserPlus, u as TrendingUp, vt as ArrowDownRight, x as Settings } from "../_libs/lucide-react.mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { t as motion } from "../_libs/framer-motion.mjs";
import { t as AppShell } from "./AppShell-DBY349Tw.mjs";
import { n as formatDateTime, r as formatFCFA, t as formatDate } from "./format-p1WSdr6g.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-CCJRliUM.mjs";
import { a as YAxis, c as Line, d as Pie, f as Cell, h as Legend, i as LineChart, l as CartesianGrid, m as Tooltip, n as PieChart, o as XAxis, p as ResponsiveContainer, r as BarChart, s as Area, t as AreaChart, u as Bar } from "../_libs/recharts+[...].mjs";
import { a as isWithinInterval, c as startOfMonth, i as parseISO, l as startOfWeek, n as subWeeks, o as format, r as subMonths, s as endOfWeek, t as fr } from "../_libs/date-fns.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-Bh-kqgp8.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Card = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	ref,
	className: cn("rounded-xl border bg-card text-card-foreground shadow", className),
	...props
}));
Card.displayName = "Card";
var CardHeader = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	ref,
	className: cn("flex flex-col space-y-1.5 p-6", className),
	...props
}));
CardHeader.displayName = "CardHeader";
var CardTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	ref,
	className: cn("font-semibold leading-none tracking-tight", className),
	...props
}));
CardTitle.displayName = "CardTitle";
var CardDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
CardDescription.displayName = "CardDescription";
var CardContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	ref,
	className: cn("p-6 pt-0", className),
	...props
}));
CardContent.displayName = "CardContent";
var CardFooter = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	ref,
	className: cn("flex items-center p-6 pt-0", className),
	...props
}));
CardFooter.displayName = "CardFooter";
var accentMap = {
	primary: {
		icon: "bg-primary/10 text-primary",
		glow: "from-primary/15",
		stroke: "hsl(var(--primary))"
	},
	emerald: {
		icon: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
		glow: "from-emerald-500/15",
		stroke: "#10b981"
	},
	amber: {
		icon: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
		glow: "from-amber-500/15",
		stroke: "#f59e0b"
	},
	violet: {
		icon: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
		glow: "from-violet-500/15",
		stroke: "#8b5cf6"
	},
	sky: {
		icon: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
		glow: "from-sky-500/15",
		stroke: "#0ea5e9"
	},
	rose: {
		icon: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
		glow: "from-rose-500/15",
		stroke: "#f43f5e"
	},
	indigo: {
		icon: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
		glow: "from-indigo-500/15",
		stroke: "#6366f1"
	},
	cyan: {
		icon: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400",
		glow: "from-cyan-500/15",
		stroke: "#06b6d4"
	}
};
function DashboardKpiCard({ title, value, icon: Icon, route, trend, spark, accent = "primary", index = 0 }) {
	const colors = accentMap[accent];
	const trendUp = (trend ?? 0) > .001;
	const trendDown = (trend ?? 0) < -.001;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
		initial: {
			opacity: 0,
			y: 12
		},
		animate: {
			opacity: 1,
			y: 0
		},
		transition: {
			duration: .25,
			delay: index * .04
		},
		whileHover: { y: -3 },
		className: "h-full",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
			href: route,
			className: "block h-full group",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "relative h-full overflow-hidden rounded-2xl border border-border bg-card p-5 transition-shadow group-hover:shadow-lg group-hover:shadow-black/5",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: cn("pointer-events-none absolute inset-0 bg-gradient-to-br to-transparent opacity-0 transition-opacity group-hover:opacity-100", colors.glow) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative flex items-start justify-between",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-xs font-medium text-muted-foreground",
							children: title
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-2 text-2xl font-bold tracking-tight",
							children: value
						})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", colors.icon),
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-5 w-5" })
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative mt-3 flex items-center justify-between gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: cn("inline-flex items-center gap-0.5 text-xs font-semibold", trend !== null && trendUp && "text-emerald-600 dark:text-emerald-400", trend !== null && trendDown && "text-rose-600 dark:text-rose-400", trend !== null && !trendUp && !trendDown && "text-muted-foreground", trend === null && "text-muted-foreground"),
							children: [
								trend !== null && trendUp && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUpRight, { className: "h-3 w-3" }),
								trend !== null && trendDown && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowDownRight, { className: "h-3 w-3" }),
								trend !== null && !trendUp && !trendDown && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "h-3 w-3" }),
								trend === null ? "—" : `${Math.abs(trend).toFixed(0)}%`
							]
						}), spark && spark.some((p) => p.value > 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-8 w-20 opacity-80",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
								width: "100%",
								height: "100%",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LineChart, {
									data: spark,
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
										type: "monotone",
										dataKey: "value",
										stroke: colors.stroke,
										strokeWidth: 2,
										dot: false,
										isAnimationActive: false
									})
								})
							})
						})]
					})
				]
			})
		})
	});
}
function DashboardEmptyState({ icon: Icon, title, description, actionLabel, actionRoute, compact = false }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: `flex flex-col items-center justify-center text-center ${compact ? "py-6" : "py-12"}`,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "grid h-14 w-14 place-items-center rounded-2xl bg-muted mb-3",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-6 w-6 text-muted-foreground" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-semibold",
				children: title
			}),
			description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-1 max-w-xs text-xs text-muted-foreground",
				children: description
			}),
			actionLabel && actionRoute && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
				href: actionRoute,
				className: "mt-4 inline-flex items-center gap-1.5 rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5" }), actionLabel]
			})
		]
	});
}
function pctChange(curr, prev) {
	if (prev === 0) return null;
	return (curr - prev) / Math.abs(prev) * 100;
}
function buildWeeklySpark(rows, dateField, valueField, weeks = 8) {
	const now = /* @__PURE__ */ new Date();
	const points = [];
	for (let i = weeks - 1; i >= 0; i--) {
		const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
		const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
		let total = 0;
		for (const r of rows) {
			const raw = dateField(r);
			if (!raw) continue;
			const d = parseISO(raw);
			if (isNaN(d.getTime())) continue;
			if (isWithinInterval(d, {
				start: weekStart,
				end: weekEnd
			})) total += valueField ? valueField(r) : 1;
		}
		points.push({
			label: format(weekStart, "dd/MM"),
			value: total
		});
	}
	return points;
}
function sumInMonth(rows, dateField, valueField, monthStart, monthEnd) {
	let total = 0;
	for (const r of rows) {
		const raw = dateField(r);
		if (!raw) continue;
		const d = parseISO(raw);
		if (isNaN(d.getTime())) continue;
		if (d >= monthStart && d < monthEnd) total += valueField(r);
	}
	return total;
}
function countInMonth(rows, dateField, monthStart, monthEnd) {
	return sumInMonth(rows, dateField, () => 1, monthStart, monthEnd);
}
function buildMonthlySeries(ventes, depenses, achats, months = 6) {
	const now = /* @__PURE__ */ new Date();
	const out = [];
	for (let i = months - 1; i >= 0; i--) {
		const mStart = startOfMonth(subMonths(now, i));
		const mEnd = startOfMonth(subMonths(now, i - 1));
		out.push({
			label: format(mStart, "MMM", { locale: fr }),
			ca: sumInMonth(ventes, (v) => v.created_at, (v) => Number(v.total) || 0, mStart, mEnd),
			depenses: sumInMonth(depenses, (d) => d.paid_at, (d) => Number(d.amount) || 0, mStart, mEnd),
			achats: sumInMonth(achats, (a) => a.created_at, (a) => Number(a.total) || 0, mStart, mEnd)
		});
	}
	return out;
}
function groupSum(rows, keyField, valueField) {
	const map = /* @__PURE__ */ new Map();
	for (const r of rows) {
		const key = keyField(r) || "Autre";
		map.set(key, (map.get(key) || 0) + valueField(r));
	}
	return Array.from(map.entries()).map(([name, value]) => ({
		name,
		value
	})).sort((a, b) => b.value - a.value);
}
function useDashboardData() {
	return useQuery({
		queryKey: ["dashboard-data-v2"],
		queryFn: async () => {
			const [ventesRes, achatsRes, depensesRes, clientsRes, fournisseursRes, servicesRes, devisRes, sessionRes] = await Promise.all([
				supabase.from("ventes").select("id, client_name, total, payment_method, created_at").order("created_at", { ascending: false }),
				supabase.from("achats").select("id, fournisseur_name, total, created_at").order("created_at", { ascending: false }),
				supabase.from("depenses").select("id, description, category, amount, paid_at, created_at").order("paid_at", { ascending: false }),
				supabase.from("clients").select("id, name, created_at").order("created_at", { ascending: false }),
				supabase.from("fournisseurs").select("id, name, created_at").order("created_at", { ascending: false }),
				supabase.from("services").select("id, name, active, created_at").order("created_at", { ascending: false }),
				supabase.from("devis").select("id, status, total, created_at").order("created_at", { ascending: false }),
				supabase.auth.getSession()
			]);
			const ventes = ventesRes.data ?? [];
			const achats = achatsRes.data ?? [];
			const depenses = depensesRes.data ?? [];
			const clients = clientsRes.data ?? [];
			const fournisseurs = fournisseursRes.data ?? [];
			const services = servicesRes.data ?? [];
			const devis = (devisRes.data ?? []).filter((d) => d.status === "accepté");
			const now = /* @__PURE__ */ new Date();
			const monthStart = startOfMonth(now);
			const prevMonthStart = startOfMonth(subMonths(now, 1));
			const revenue = ventes.reduce((s, v) => s + (Number(v.total) || 0), 0) + devis.reduce((s, d) => s + (Number(d.total) || 0), 0);
			const totalDepenses = depenses.reduce((s, d) => s + (Number(d.amount) || 0), 0);
			const totalAchats = achats.reduce((s, a) => s + (Number(a.total) || 0), 0);
			const benefice = revenue - totalDepenses - totalAchats;
			const revenueMonth = sumInMonth(ventes, (v) => v.created_at, (v) => Number(v.total) || 0, monthStart, now) + sumInMonth(devis, (d) => d.created_at, (d) => Number(d.total) || 0, monthStart, now);
			const revenuePrevMonth = sumInMonth(ventes, (v) => v.created_at, (v) => Number(v.total) || 0, prevMonthStart, monthStart) + sumInMonth(devis, (d) => d.created_at, (d) => Number(d.total) || 0, prevMonthStart, monthStart);
			const depensesMonth = sumInMonth(depenses, (d) => d.paid_at, (d) => Number(d.amount) || 0, monthStart, now);
			const depensesPrevMonth = sumInMonth(depenses, (d) => d.paid_at, (d) => Number(d.amount) || 0, prevMonthStart, monthStart);
			const achatsMonth = sumInMonth(achats, (a) => a.created_at, (a) => Number(a.total) || 0, monthStart, now);
			const achatsPrevMonth = sumInMonth(achats, (a) => a.created_at, (a) => Number(a.total) || 0, prevMonthStart, monthStart);
			const beneficeMonth = revenueMonth - depensesMonth - achatsMonth;
			const beneficePrevMonth = revenuePrevMonth - depensesPrevMonth - achatsPrevMonth;
			const clientsMonth = countInMonth(clients, (c) => c.created_at, monthStart, now);
			const clientsPrevMonth = countInMonth(clients, (c) => c.created_at, prevMonthStart, monthStart);
			const fournisseursMonth = countInMonth(fournisseurs, (f) => f.created_at, monthStart, now);
			const fournisseursPrevMonth = countInMonth(fournisseurs, (f) => f.created_at, prevMonthStart, monthStart);
			const ventesMonth = countInMonth(ventes, (v) => v.created_at, monthStart, now);
			const ventesPrevMonth = countInMonth(ventes, (v) => v.created_at, prevMonthStart, monthStart);
			const servicesMonth = countInMonth(services, (s) => s.created_at, monthStart, now);
			const servicesPrevMonth = countInMonth(services, (s) => s.created_at, prevMonthStart, monthStart);
			const kpis = {
				revenue: {
					value: revenue,
					trend: pctChange(revenueMonth, revenuePrevMonth),
					spark: buildWeeklySpark([...ventes.map((v) => ({
						total: Number(v.total) || 0,
						created_at: v.created_at
					})), ...devis.map((d) => ({
						total: Number(d.total) || 0,
						created_at: d.created_at
					}))], (r) => r.created_at, (r) => Number(r.total) || 0)
				},
				depenses: {
					value: totalDepenses,
					trend: pctChange(depensesMonth, depensesPrevMonth),
					spark: buildWeeklySpark(depenses, (d) => d.paid_at, (d) => Number(d.amount) || 0)
				},
				achats: {
					value: totalAchats,
					trend: pctChange(achatsMonth, achatsPrevMonth),
					spark: buildWeeklySpark(achats, (a) => a.created_at, (a) => Number(a.total) || 0)
				},
				benefice: {
					value: benefice,
					trend: pctChange(beneficeMonth, beneficePrevMonth),
					spark: buildWeeklySpark(ventes, (v) => v.created_at, (v) => Number(v.total) || 0)
				},
				clients: {
					value: clients.length,
					trend: pctChange(clientsMonth, clientsPrevMonth),
					spark: buildWeeklySpark(clients, (c) => c.created_at)
				},
				fournisseurs: {
					value: fournisseurs.length,
					trend: pctChange(fournisseursMonth, fournisseursPrevMonth),
					spark: buildWeeklySpark(fournisseurs, (f) => f.created_at)
				},
				ventes: {
					value: ventes.length,
					trend: pctChange(ventesMonth, ventesPrevMonth),
					spark: buildWeeklySpark(ventes, (v) => v.created_at)
				},
				services: {
					value: services.length,
					trend: pctChange(servicesMonth, servicesPrevMonth),
					spark: buildWeeklySpark(services, (s) => s.created_at)
				}
			};
			const monthlySeries = buildMonthlySeries([...ventes.map((v) => ({
				total: Number(v.total) || 0,
				created_at: v.created_at
			})), ...devis.map((d) => ({
				total: Number(d.total) || 0,
				created_at: d.created_at
			}))], depenses.map((d) => ({
				amount: Number(d.amount) || 0,
				paid_at: d.paid_at
			})), achats.map((a) => ({
				total: Number(a.total) || 0,
				created_at: a.created_at
			})));
			const ventesByMethod = groupSum(ventes, (v) => v.payment_method, (v) => Number(v.total) || 0);
			const depensesByCategory = groupSum(depenses, (d) => d.category, (d) => Number(d.amount) || 0);
			const activity = [
				...ventes.slice(0, 8).map((v) => ({
					id: `vente-${v.id}`,
					type: "vente",
					title: v.client_name || "Client comptant",
					subtitle: "Nouvelle vente",
					amount: Number(v.total),
					date: v.created_at,
					route: "/ventes"
				})),
				...achats.slice(0, 8).map((a) => ({
					id: `achat-${a.id}`,
					type: "achat",
					title: a.fournisseur_name || "Fournisseur",
					subtitle: "Nouvel achat",
					amount: Number(a.total),
					date: a.created_at,
					route: "/achats"
				})),
				...depenses.slice(0, 8).map((d) => ({
					id: `depense-${d.id}`,
					type: "depense",
					title: d.description || d.category,
					subtitle: "Nouvelle dépense",
					amount: Number(d.amount),
					date: d.paid_at,
					route: "/depenses"
				})),
				...clients.slice(0, 8).map((c) => ({
					id: `client-${c.id}`,
					type: "client",
					title: c.name,
					subtitle: "Nouveau client",
					date: c.created_at,
					route: "/clients"
				})),
				...fournisseurs.slice(0, 8).map((f) => ({
					id: `fournisseur-${f.id}`,
					type: "fournisseur",
					title: f.name,
					subtitle: "Nouveau fournisseur",
					date: f.created_at,
					route: "/fournisseurs"
				}))
			].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
			const session = sessionRes.data?.session ?? null;
			return {
				kpis,
				monthlySeries,
				ventesByMethod,
				depensesByCategory,
				lists: {
					ventes: ventes.slice(0, 5),
					achats: achats.slice(0, 5),
					depenses: depenses.slice(0, 5),
					clients: clients.slice(0, 5),
					fournisseurs: fournisseurs.slice(0, 5)
				},
				activity: activity.slice(0, 10),
				counts: {
					ventes: ventes.length,
					achats: achats.length,
					depenses: depenses.length,
					clients: clients.length,
					fournisseurs: fournisseurs.length,
					services: services.length
				},
				session: session ? {
					email: session.user?.email ?? "Utilisateur",
					full_name: session.user?.user_metadata?.full_name ?? null,
					lastSignInAt: session.user?.last_sign_in_at ?? null
				} : null
			};
		},
		staleTime: 3e4
	});
}
var PIE_COLORS = [
	"#2563eb",
	"#10b981",
	"#f59e0b",
	"#8b5cf6",
	"#f43f5e",
	"#06b6d4",
	"#6366f1"
];
function Dashboard() {
	const { data, isLoading, error } = useDashboardData();
	const greeting = (0, import_react.useMemo)(() => {
		const h = (/* @__PURE__ */ new Date()).getHours();
		if (h < 12) return "Bonjour";
		if (h < 18) return "Bon après-midi";
		return "Bonsoir";
	}, []);
	const userName = (0, import_react.useMemo)(() => {
		if (!data?.session) return "Utilisateur";
		return data.session.full_name || "Utilisateur";
	}, [data?.session]);
	const today = (0, import_react.useMemo)(() => (/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR", {
		weekday: "long",
		day: "numeric",
		month: "long",
		year: "numeric"
	}), []);
	const quickActions = [
		{
			title: "Nouvelle vente",
			icon: ShoppingCart,
			route: "/ventes"
		},
		{
			title: "Nouveau devis",
			icon: FileText,
			route: "/devis"
		},
		{
			title: "Nouveau client",
			icon: UserPlus,
			route: "/clients"
		},
		{
			title: "Nouveau fournisseur",
			icon: Building2,
			route: "/fournisseurs"
		},
		{
			title: "Nouvel achat",
			icon: ShoppingBag,
			route: "/achats"
		},
		{
			title: "Nouvelle dépense",
			icon: CreditCard,
			route: "/depenses"
		},
		{
			title: "Nouveau service",
			icon: Wrench,
			route: "/services"
		},
		{
			title: "Rapports",
			icon: ChartColumn,
			route: "/rapports"
		},
		{
			title: "Paramètres",
			icon: Settings,
			route: "/parametres"
		}
	];
	if (error) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Dashboard",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-6 text-sm text-destructive",
			children: "Une erreur est survenue lors du chargement du tableau de bord."
		})
	});
	const noDataAtAll = !isLoading && data && data.counts.ventes === 0 && data.counts.achats === 0 && data.counts.depenses === 0 && data.counts.clients === 0 && data.counts.fournisseurs === 0 && data.counts.services === 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Dashboard",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			initial: { opacity: 0 },
			animate: { opacity: 1 },
			transition: { duration: .3 },
			className: "space-y-8 pb-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
					className: "text-2xl font-bold tracking-tight md:text-3xl",
					children: [
						greeting,
						", ",
						userName,
						" 👋"
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground capitalize mt-1",
					children: today
				})] }),
				isLoading || !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse",
					children: Array.from({ length: 8 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { className: "h-32 rounded-2xl" }, i))
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardKpiCard, {
							index: 0,
							title: "Chiffre d'affaires",
							value: formatFCFA(data.kpis.revenue.value),
							icon: Wallet,
							route: "/ventes",
							trend: data.kpis.revenue.trend,
							spark: data.kpis.revenue.spark,
							accent: "primary"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardKpiCard, {
							index: 1,
							title: "Dépenses",
							value: formatFCFA(data.kpis.depenses.value),
							icon: Receipt,
							route: "/depenses",
							trend: data.kpis.depenses.trend,
							spark: data.kpis.depenses.spark,
							accent: "rose"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardKpiCard, {
							index: 2,
							title: "Achats",
							value: formatFCFA(data.kpis.achats.value),
							icon: Package,
							route: "/achats",
							trend: data.kpis.achats.trend,
							spark: data.kpis.achats.spark,
							accent: "amber"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardKpiCard, {
							index: 3,
							title: "Bénéfice",
							value: formatFCFA(data.kpis.benefice.value),
							icon: TrendingUp,
							route: "/rapports",
							trend: data.kpis.benefice.trend,
							spark: data.kpis.benefice.spark,
							accent: "emerald"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardKpiCard, {
							index: 4,
							title: "Clients",
							value: String(data.kpis.clients.value),
							icon: Users,
							route: "/clients",
							trend: data.kpis.clients.trend,
							spark: data.kpis.clients.spark,
							accent: "sky"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardKpiCard, {
							index: 5,
							title: "Fournisseurs",
							value: String(data.kpis.fournisseurs.value),
							icon: Truck,
							route: "/fournisseurs",
							trend: data.kpis.fournisseurs.trend,
							spark: data.kpis.fournisseurs.spark,
							accent: "violet"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardKpiCard, {
							index: 6,
							title: "Ventes",
							value: String(data.kpis.ventes.value),
							icon: ShoppingCart,
							route: "/ventes",
							trend: data.kpis.ventes.trend,
							spark: data.kpis.ventes.spark,
							accent: "indigo"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardKpiCard, {
							index: 7,
							title: "Produits & Services",
							value: String(data.kpis.services.value),
							icon: Wrench,
							route: "/services",
							trend: data.kpis.services.trend,
							spark: data.kpis.services.spark,
							accent: "cyan"
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "space-y-3",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
						className: "text-lg font-bold",
						children: "Actions rapides"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3",
						children: quickActions.map((action, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
							initial: {
								opacity: 0,
								y: 8
							},
							animate: {
								opacity: 1,
								y: 0
							},
							transition: {
								duration: .2,
								delay: i * .02
							},
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
								to: action.route,
								className: "flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border hover:border-primary hover:shadow-md transition-all h-full",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(action.icon, { className: "h-5 w-5" })
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium text-center",
									children: action.title
								})]
							})
						}, action.title))
					})]
				}),
				isLoading || !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse",
					children: Array.from({ length: 3 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, { className: "h-72 rounded-2xl" }, i))
				}) : noDataAtAll ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
					className: "rounded-2xl",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardEmptyState, {
						icon: ChartColumn,
						title: "Aucune donnée pour le moment",
						description: "Vos graphiques et statistiques apparaîtront automatiquement dès que vous enregistrerez vos premières ventes, achats ou dépenses.",
						actionLabel: "Créer une première vente",
						actionRoute: "/ventes"
					})
				}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 lg:grid-cols-3 gap-6",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "p-6 rounded-2xl lg:col-span-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "font-bold mb-4",
								children: "Évolution du chiffre d'affaires"
							}), data.counts.ventes === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardEmptyState, {
								compact: true,
								icon: Wallet,
								title: "Aucune vente enregistrée",
								actionLabel: "Créer une première vente",
								actionRoute: "/ventes"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-64",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
									width: "100%",
									height: "100%",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(LineChart, {
										data: data.monthlySeries,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
												strokeDasharray: "3 3",
												className: "stroke-border"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
												dataKey: "label",
												fontSize: 12,
												tickLine: false
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
												fontSize: 12,
												tickLine: false,
												tickFormatter: (v) => `${(v / 1e3).toFixed(0)}k`
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { formatter: (v) => formatFCFA(v) }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
												type: "monotone",
												dataKey: "ca",
												name: "CA",
												stroke: "#2563eb",
												strokeWidth: 2.5,
												dot: false
											})
										]
									})
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "p-6 rounded-2xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "font-bold mb-4",
								children: "Répartition des ventes"
							}), data.ventesByMethod.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardEmptyState, {
								compact: true,
								icon: ShoppingCart,
								title: "Aucune vente enregistrée",
								actionLabel: "Créer une première vente",
								actionRoute: "/ventes"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-64",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
									width: "100%",
									height: "100%",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PieChart, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pie, {
											data: data.ventesByMethod,
											dataKey: "value",
											nameKey: "name",
											innerRadius: 45,
											outerRadius: 75,
											paddingAngle: 2,
											children: data.ventesByMethod.map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { fill: PIE_COLORS[i % PIE_COLORS.length] }, i))
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { formatter: (v) => formatFCFA(v) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, { wrapperStyle: { fontSize: 11 } })
									] })
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "p-6 rounded-2xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "font-bold mb-4",
								children: "Dépenses vs Revenus"
							}), data.counts.depenses === 0 && data.counts.ventes === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardEmptyState, {
								compact: true,
								icon: TrendingUp,
								title: "Aucune donnée financière",
								actionLabel: "Ajouter une dépense",
								actionRoute: "/depenses"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-64",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
									width: "100%",
									height: "100%",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(BarChart, {
										data: data.monthlySeries,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
												strokeDasharray: "3 3",
												className: "stroke-border"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
												dataKey: "label",
												fontSize: 12,
												tickLine: false
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
												fontSize: 12,
												tickLine: false,
												tickFormatter: (v) => `${(v / 1e3).toFixed(0)}k`
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { formatter: (v) => formatFCFA(v) }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, { wrapperStyle: { fontSize: 11 } }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
												dataKey: "ca",
												name: "Revenus",
												fill: "#2563eb",
												radius: [
													4,
													4,
													0,
													0
												]
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bar, {
												dataKey: "depenses",
												name: "Dépenses",
												fill: "#f43f5e",
												radius: [
													4,
													4,
													0,
													0
												]
											})
										]
									})
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "p-6 rounded-2xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "font-bold mb-4",
								children: "Répartition des dépenses"
							}), data.depensesByCategory.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardEmptyState, {
								compact: true,
								icon: Receipt,
								title: "Aucune dépense enregistrée",
								actionLabel: "Ajouter une dépense",
								actionRoute: "/depenses"
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-64",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
									width: "100%",
									height: "100%",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(PieChart, { children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pie, {
											data: data.depensesByCategory,
											dataKey: "value",
											nameKey: "name",
											innerRadius: 45,
											outerRadius: 75,
											paddingAngle: 2,
											children: data.depensesByCategory.map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cell, { fill: PIE_COLORS[i % PIE_COLORS.length] }, i))
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { formatter: (v) => formatFCFA(v) }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, { wrapperStyle: { fontSize: 11 } })
									] })
								})
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "p-6 rounded-2xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
								className: "font-bold mb-4",
								children: "Évolution mensuelle"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-64",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResponsiveContainer, {
									width: "100%",
									height: "100%",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AreaChart, {
										data: data.monthlySeries,
										children: [
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CartesianGrid, {
												strokeDasharray: "3 3",
												className: "stroke-border"
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(XAxis, {
												dataKey: "label",
												fontSize: 12,
												tickLine: false
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(YAxis, {
												fontSize: 12,
												tickLine: false,
												tickFormatter: (v) => `${(v / 1e3).toFixed(0)}k`
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Tooltip, { formatter: (v) => formatFCFA(v) }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Legend, { wrapperStyle: { fontSize: 11 } }),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
												type: "monotone",
												dataKey: "ca",
												name: "CA",
												stackId: "1",
												stroke: "#2563eb",
												fill: "#2563eb",
												fillOpacity: .25
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
												type: "monotone",
												dataKey: "achats",
												name: "Achats",
												stackId: "2",
												stroke: "#f59e0b",
												fill: "#f59e0b",
												fillOpacity: .25
											}),
											/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Area, {
												type: "monotone",
												dataKey: "depenses",
												name: "Dépenses",
												stackId: "3",
												stroke: "#f43f5e",
												fill: "#f43f5e",
												fillOpacity: .25
											})
										]
									})
								})
							})]
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 lg:grid-cols-3 gap-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
						className: "p-6 rounded-2xl lg:col-span-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
							className: "font-bold mb-4",
							children: "Activité récente"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
							defaultValue: "journal",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
									className: "flex-wrap h-auto",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
											value: "journal",
											children: "Journal"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
											value: "ventes",
											children: "Ventes"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
											value: "achats",
											children: "Achats"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
											value: "depenses",
											children: "Dépenses"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
											value: "clients",
											children: "Clients"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsTrigger, {
											value: "fournisseurs",
											children: "Fournisseurs"
										})
									]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
									value: "journal",
									children: data.activity.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardEmptyState, {
										compact: true,
										icon: Clock,
										title: "Aucune activité pour le moment",
										description: "Toutes vos actions récentes apparaîtront ici."
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "divide-y divide-border",
										children: data.activity.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("a", {
											href: item.route,
											className: "flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "font-medium truncate",
													children: item.title
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
													className: "text-xs text-muted-foreground",
													children: [
														item.subtitle,
														" · ",
														formatDate(item.date)
													]
												})]
											}), item.amount !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "shrink-0 font-semibold text-sm",
												children: formatFCFA(item.amount)
											})]
										}) }, item.id))
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
									value: "ventes",
									children: data.lists.ventes.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardEmptyState, {
										compact: true,
										icon: ShoppingCart,
										title: "Aucune vente enregistrée",
										actionLabel: "Créer une première vente",
										actionRoute: "/ventes"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "divide-y divide-border",
										children: data.lists.ventes.map((v) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/ventes",
											className: "flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "font-medium truncate",
													children: v.client_name || "Client comptant"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs text-muted-foreground",
													children: formatDate(v.created_at)
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "shrink-0 font-semibold text-sm",
												children: formatFCFA(Number(v.total))
											})]
										}) }, v.id))
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
									value: "achats",
									children: data.lists.achats.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardEmptyState, {
										compact: true,
										icon: Package,
										title: "Aucun achat enregistré",
										actionLabel: "Créer un premier achat",
										actionRoute: "/achats"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "divide-y divide-border",
										children: data.lists.achats.map((a) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/achats",
											className: "flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "font-medium truncate",
													children: a.fournisseur_name || "Fournisseur"
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs text-muted-foreground",
													children: formatDate(a.created_at)
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "shrink-0 font-semibold text-sm",
												children: formatFCFA(Number(a.total))
											})]
										}) }, a.id))
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
									value: "depenses",
									children: data.lists.depenses.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardEmptyState, {
										compact: true,
										icon: Receipt,
										title: "Aucune dépense enregistrée",
										actionLabel: "Ajouter une dépense",
										actionRoute: "/depenses"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "divide-y divide-border",
										children: data.lists.depenses.map((d) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/depenses",
											className: "flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "font-medium truncate",
													children: d.description || d.category
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
													className: "text-xs text-muted-foreground",
													children: formatDate(d.paid_at)
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "shrink-0 font-semibold text-sm",
												children: formatFCFA(Number(d.amount))
											})]
										}) }, d.id))
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
									value: "clients",
									children: data.lists.clients.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardEmptyState, {
										compact: true,
										icon: Users,
										title: "Aucun client enregistré",
										actionLabel: "Ajouter un client",
										actionRoute: "/clients"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "divide-y divide-border",
										children: data.lists.clients.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/clients",
											className: "flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "font-medium truncate",
												children: c.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "shrink-0 text-xs text-muted-foreground",
												children: formatDate(c.created_at)
											})]
										}) }, c.id))
									})
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
									value: "fournisseurs",
									children: data.lists.fournisseurs.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DashboardEmptyState, {
										compact: true,
										icon: Truck,
										title: "Aucun fournisseur enregistré",
										actionLabel: "Ajouter un fournisseur",
										actionRoute: "/fournisseurs"
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
										className: "divide-y divide-border",
										children: data.lists.fournisseurs.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
											to: "/fournisseurs",
											className: "flex items-center justify-between gap-3 py-2.5 text-sm hover:bg-muted/50 rounded-lg px-2 -mx-2 transition-colors",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
												className: "font-medium truncate",
												children: f.name
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
												className: "shrink-0 text-xs text-muted-foreground",
												children: formatDate(f.created_at)
											})]
										}) }, f.id))
									})
								})
							]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "space-y-6",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
							className: "p-6 rounded-2xl",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h3", {
								className: "font-bold mb-4 flex items-center gap-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LogIn, { className: "h-4 w-4 text-primary" }), " Session"]
							}), data.session ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2 text-sm",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: "Connecté en tant que"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium truncate max-w-[160px]",
										children: data.session.email
									})]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: "Dernière connexion"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium",
										children: data.session.lastSignInAt ? formatDateTime(data.session.lastSignInAt) : "-"
									})]
								})]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "text-xs text-muted-foreground",
								children: "Aucune session active."
							})]
						})
					})]
				})] })
			]
		})
	});
}
//#endregion
export { Dashboard as component };

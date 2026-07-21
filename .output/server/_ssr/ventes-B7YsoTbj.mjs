import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { C as Scissors, D as Printer, E as Receipt, F as MessageCircle, G as Image, I as Menu, M as Palette, O as Plus, P as Minus, S as Search, U as Layers, Y as FileText, dt as Check, f as Trash2, h as Smartphone, ht as Banknote, i as Wallet, m as Sparkles, n as X, nt as CreditCard, p as Stamp, rt as Copy } from "../_libs/lucide-react.mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as useCompanySettings } from "./use-company-settings-X3aX6rL8.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion.mjs";
import { a as Sidebar, i as SheetTrigger, n as SheetContent, o as SidebarContent, r as SheetTitle, t as Sheet } from "./sheet-BDKZgIte.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as makeNumber } from "./format-p1WSdr6g.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ventes-B7YsoTbj.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var CATALOG = [
	{
		id: "imp-n-a4",
		name: "Impression N&B A4",
		price: 100,
		unit: "page",
		category: "Impression",
		icon: FileText
	},
	{
		id: "imp-c-a4",
		name: "Impression Couleur A4",
		price: 300,
		unit: "page",
		category: "Impression",
		icon: Palette
	},
	{
		id: "imp-n-a3",
		name: "Impression N&B A3",
		price: 250,
		unit: "page",
		category: "Impression",
		icon: FileText
	},
	{
		id: "imp-c-a3",
		name: "Impression Couleur A3",
		price: 600,
		unit: "page",
		category: "Impression",
		icon: Palette
	},
	{
		id: "photo",
		name: "Photo d'identité",
		price: 1500,
		unit: "planche",
		category: "Impression",
		icon: Image
	},
	{
		id: "cop-n-a4",
		name: "Photocopie N&B A4",
		price: 50,
		unit: "page",
		category: "Copie",
		icon: Copy
	},
	{
		id: "cop-c-a4",
		name: "Photocopie Couleur A4",
		price: 200,
		unit: "page",
		category: "Copie",
		icon: Copy
	},
	{
		id: "scan",
		name: "Scan document",
		price: 200,
		unit: "page",
		category: "Numérique",
		icon: Layers
	},
	{
		id: "grav-cd",
		name: "Gravure CD/DVD",
		price: 1e3,
		unit: "unité",
		category: "Numérique",
		icon: Layers
	},
	{
		id: "rel-spir",
		name: "Reliure spirale",
		price: 1500,
		unit: "unité",
		category: "Reliure",
		icon: Layers
	},
	{
		id: "rel-therm",
		name: "Reliure thermique",
		price: 2500,
		unit: "unité",
		category: "Reliure",
		icon: Layers
	},
	{
		id: "plast-a4",
		name: "Plastification A4",
		price: 500,
		unit: "unité",
		category: "Finition",
		icon: Stamp
	},
	{
		id: "plast-a3",
		name: "Plastification A3",
		price: 1e3,
		unit: "unité",
		category: "Finition",
		icon: Stamp
	},
	{
		id: "decoupe",
		name: "Découpe / Massicot",
		price: 300,
		unit: "lot",
		category: "Finition",
		icon: Scissors
	}
];
var CATEGORIES = [
	"Tous",
	"Impression",
	"Copie",
	"Reliure",
	"Finition",
	"Numérique"
];
function PosPage() {
	const [query, setQuery] = (0, import_react.useState)("");
	const [category, setCategory] = (0, import_react.useState)("Tous");
	const [cart, setCart] = (0, import_react.useState)([]);
	const [client, setClient] = (0, import_react.useState)("");
	const [discount, setDiscount] = (0, import_react.useState)(0);
	const [payment, setPayment] = (0, import_react.useState)("Espèces");
	const [checkout, setCheckout] = (0, import_react.useState)(null);
	const [saving, setSaving] = (0, import_react.useState)(false);
	const [mobileMenuOpen, setMobileMenuOpen] = (0, import_react.useState)(false);
	const { data: dbServices } = useQuery({
		queryKey: ["services", "catalog"],
		queryFn: async () => {
			const { data, error } = await supabase.from("services").select("id, name, category, unit, price").eq("active", true).order("name");
			if (error) throw error;
			return data ?? [];
		}
	});
	const { settings, logoUrl } = useCompanySettings();
	const catalog = (0, import_react.useMemo)(() => {
		if (dbServices && dbServices.length > 0) return dbServices.map((s) => ({
			id: s.id,
			name: s.name,
			price: Number(s.price),
			unit: s.unit ?? "unité",
			category: s.category ?? "Impression",
			icon: FileText
		}));
		return CATALOG;
	}, [dbServices]);
	const filtered = (0, import_react.useMemo)(() => {
		return catalog.filter((s) => {
			const matchCat = category === "Tous" || s.category === category;
			const matchQ = s.name.toLowerCase().includes(query.toLowerCase());
			return matchCat && matchQ;
		});
	}, [
		query,
		category,
		catalog
	]);
	const subTotal = cart.reduce((sum, i) => sum + i.qty * i.price, 0);
	const total = Math.max(0, subTotal - discount);
	const addToCart = (s) => {
		setCart((c) => {
			if (c.find((i) => i.id === s.id)) return c.map((i) => i.id === s.id ? {
				...i,
				qty: i.qty + 1
			} : i);
			return [...c, {
				...s,
				qty: 1
			}];
		});
	};
	const setQty = (id, qty) => {
		if (qty <= 0) return setCart((c) => c.filter((i) => i.id !== id));
		setCart((c) => c.map((i) => i.id === id ? {
			...i,
			qty
		} : i));
	};
	const clearCart = () => {
		setCart([]);
		setClient("");
		setDiscount(0);
	};
	const validate = async () => {
		if (cart.length === 0) return;
		setSaving(true);
		const number = "T-" + Math.floor(Math.random() * 9e5 + 1e5);
		const dbNumber = makeNumber("VTE");
		try {
			const { data: venteRow, error: e1 } = await supabase.from("ventes").insert({
				number: dbNumber,
				client_name: client || "Client comptoir",
				subtotal: subTotal,
				discount,
				total,
				payment_method: payment,
				cashier: "Bamba"
			}).select("id").single();
			if (e1 || !venteRow) throw e1 ?? /* @__PURE__ */ new Error("Insertion échouée");
			const rows = cart.map((i) => ({
				vente_id: venteRow.id,
				service_id: /^[0-9a-f-]{36}$/i.test(i.id) ? i.id : null,
				name: i.name,
				unit: i.unit,
				qty: i.qty,
				price: i.price,
				line_total: i.qty * i.price
			}));
			const { error: e2 } = await supabase.from("vente_items").insert(rows);
			if (e2) throw e2;
			toast.success(`Vente enregistrée (${dbNumber})`);
		} catch (err) {
			const msg = err instanceof Error ? err.message : "Erreur d'enregistrement";
			toast.error(msg);
			setSaving(false);
			return;
		}
		setCheckout({
			number: dbNumber || number,
			date: /* @__PURE__ */ new Date(),
			items: cart,
			subTotal,
			discount,
			total,
			payment,
			client: client || "Client comptoir",
			cashier: "Bamba"
		});
		setSaving(false);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex flex-col md:flex-row h-screen w-full bg-background text-foreground",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "hidden md:block",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sidebar, {})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
				className: "flex-1 flex flex-col md:flex-row min-h-0 min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
					className: "flex-1 flex flex-col min-h-0 min-w-0 border-b md:border-b-0 md:border-r border-border pb-[40vh] md:pb-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
						className: "px-4 md:px-6 pt-4 md:pt-6 pb-4 border-b border-border",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex items-center gap-2 mb-3 md:hidden",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
									open: mobileMenuOpen,
									onOpenChange: setMobileMenuOpen,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTrigger, {
										asChild: true,
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
											variant: "ghost",
											size: "icon",
											className: "h-9 w-9",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Menu, { className: "h-5 w-5" })
										})
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetContent, {
										side: "left",
										className: "w-[300px] p-0 bg-sidebar text-sidebar-foreground",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTitle, {
											className: "sr-only",
											children: "Navigation"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex flex-col h-full p-4 gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "flex items-center gap-2 px-2 py-4",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "grid place-items-center h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-lg shadow-primary/30",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-5 w-5 text-white" })
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "min-w-0",
													children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
														className: "text-sm font-bold tracking-tight",
														children: settings?.company_name ?? "Mon Entreprise"
													})
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarContent, { onItemClick: () => setMobileMenuOpen(false) })]
										})]
									})]
								})
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-baseline justify-between mb-3",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
									className: "text-xl md:text-2xl font-bold tracking-tight",
									children: "Point de vente"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs md:text-sm text-muted-foreground",
									children: "Imprimerie — services & articles"
								})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "text-[10px] md:text-xs text-muted-foreground",
									children: (/* @__PURE__ */ new Date()).toLocaleDateString("fr-FR", {
										weekday: "long",
										day: "numeric",
										month: "long"
									})
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "relative",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
									value: query,
									onChange: (e) => setQuery(e.target.value),
									placeholder: "Rechercher un service...",
									className: "w-full rounded-xl md:rounded-2xl bg-muted/60 border border-border pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/40 transition"
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-1.5 md:gap-2 mt-3",
								children: CATEGORIES.map((c) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setCategory(c),
									className: `px-3 py-1 rounded-full text-[10px] md:text-xs font-medium transition-colors ${category === c ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:text-foreground"}`,
									children: c
								}, c))
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex-1 overflow-y-auto scrollbar-thin p-3 md:p-6",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 md:gap-3",
							children: [filtered.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.button, {
								whileHover: { y: -2 },
								whileTap: { scale: .98 },
								onClick: () => addToCart(s),
								className: "group text-left rounded-xl md:rounded-2xl border border-border bg-card p-3 md:p-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "h-8 w-8 md:h-10 md:w-10 rounded-lg md:rounded-xl bg-primary/10 text-primary grid place-items-center mb-2 md:mb-3 group-hover:bg-primary group-hover:text-white transition-colors",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(s.icon, { className: "h-4 w-4 md:h-5 md:w-5" })
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "font-medium text-xs md:text-sm leading-tight",
										children: s.name
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "mt-1 md:mt-2 flex items-baseline justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-primary font-semibold text-xs md:text-sm",
											children: formatFCFA(s.price)
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
											className: "text-[9px] md:text-[10px] uppercase tracking-wide text-muted-foreground",
											children: ["/ ", s.unit]
										})]
									})
								]
							}, s.id)), filtered.length === 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "col-span-full text-center py-10 md:py-16 text-muted-foreground text-sm",
								children: "Aucun service trouvé"
							})]
						})
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
					className: "fixed bottom-0 left-0 w-full z-40 h-[45vh] md:relative md:bottom-auto md:left-auto md:w-[380px] md:h-auto shrink-0 flex flex-col bg-card border-t md:border-t-0 md:border-l border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "px-4 md:px-5 pt-4 md:pt-6 pb-3 md:pb-4 border-b border-border",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-between",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
									className: "font-semibold text-sm md:text-base",
									children: "Ticket en cours"
								}), cart.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
									onClick: clearCart,
									className: "text-xs text-muted-foreground hover:text-destructive flex items-center gap-1",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3 w-3" }), " Vider"]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								value: client,
								onChange: (e) => setClient(e.target.value),
								placeholder: "Nom du client (facultatif)",
								className: "mt-2 md:mt-3 w-full rounded-lg md:rounded-xl bg-muted/60 border border-border px-3 py-1.5 md:py-2 text-xs md:text-sm outline-none focus:border-primary/40"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "flex-1 overflow-y-auto scrollbar-thin px-3 md:px-5 py-2 md:py-3",
							children: cart.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-full grid place-items-center text-center text-muted-foreground text-xs md:text-sm p-4 md:p-6",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Receipt, { className: "h-8 w-8 md:h-10 md:w-10 mx-auto mb-2 md:mb-3 opacity-40" }),
									"Sélectionnez des services",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
									"pour démarrer la vente"
								] })
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
								className: "space-y-1.5 md:space-y-2",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
									initial: false,
									children: cart.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.li, {
										layout: true,
										initial: {
											opacity: 0,
											y: 6
										},
										animate: {
											opacity: 1,
											y: 0
										},
										exit: {
											opacity: 0,
											x: 20
										},
										className: "rounded-lg md:rounded-xl border border-border bg-background p-2 md:p-3",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "flex items-start justify-between gap-2",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "min-w-0",
												children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
													className: "text-xs md:text-sm font-medium truncate",
													children: i.name
												}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
													className: "text-[10px] md:text-xs text-muted-foreground",
													children: [
														formatFCFA(i.price),
														" / ",
														i.unit
													]
												})]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												onClick: () => setQty(i.id, 0),
												className: "text-muted-foreground hover:text-destructive",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-3.5 w-3.5" })
											})]
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
											className: "mt-1.5 md:mt-2 flex items-center justify-between",
											children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
												className: "inline-flex items-center rounded-lg border border-border",
												children: [
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => setQty(i.id, i.qty - 1),
														className: "h-7 w-7 md:h-8 md:w-8 grid place-items-center hover:bg-muted",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Minus, { className: "h-3 w-3" })
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
														value: i.qty,
														onChange: (e) => setQty(i.id, Math.max(0, parseInt(e.target.value) || 0)),
														className: "w-8 md:w-10 text-center bg-transparent outline-none text-xs md:text-sm"
													}),
													/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
														onClick: () => setQty(i.id, i.qty + 1),
														className: "h-7 w-7 md:h-8 md:w-8 grid place-items-center hover:bg-muted",
														children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3 w-3" })
													})
												]
											}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
												className: "text-xs md:text-sm font-semibold text-primary",
												children: formatFCFA(i.qty * i.price)
											})]
										})]
									}, i.id))
								})
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "border-t border-border px-4 md:px-5 py-3 md:py-4 space-y-2 md:space-y-3 shrink-0",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between text-xs md:text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: "Sous-total"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "font-medium",
										children: formatFCFA(subTotal)
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between text-xs md:text-sm",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-muted-foreground",
										children: "Remise"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: "number",
										min: 0,
										value: discount || "",
										onChange: (e) => setDiscount(Math.max(0, parseInt(e.target.value) || 0)),
										placeholder: "0",
										className: "w-20 md:w-24 text-right rounded-lg bg-muted/60 border border-border px-2 py-1 text-xs md:text-sm outline-none focus:border-primary/40"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center justify-between pt-1.5 md:pt-2 border-t border-border",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs md:text-sm font-medium",
										children: "Total"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-lg md:text-xl font-bold text-primary",
										children: formatFCFA(total)
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
									className: "grid grid-cols-4 gap-1 pt-0.5 md:pt-1",
									children: [
										{
											m: "Espèces",
											icon: Banknote
										},
										{
											m: "Wave",
											icon: Smartphone
										},
										{
											m: "Orange Money",
											icon: Wallet
										},
										{
											m: "Carte",
											icon: CreditCard
										}
									].map(({ m, icon: Icon }) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
										onClick: () => setPayment(m),
										className: `flex flex-col items-center gap-0.5 py-1.5 rounded-lg border text-[9px] md:text-[11px] transition ${payment === m ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`,
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, { className: "h-3 w-3 md:h-4 md:w-4" }), m]
									}, m))
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									disabled: cart.length === 0 || saving,
									onClick: validate,
									className: "w-full mt-1.5 md:mt-2 py-2.5 md:py-3 rounded-xl md:rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-white font-semibold shadow-lg shadow-primary/30 disabled:opacity-40 disabled:shadow-none hover:scale-[1.01] transition text-sm md:text-base",
									children: saving ? "Enregistrement..." : `Encaisser ${formatFCFA(total)}`
								})
							]
						})
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: checkout && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ReceiptModal, {
				ticket: checkout,
				settings,
				logoUrl,
				onClose: () => {
					setCheckout(null);
					clearCart();
				}
			}) })
		]
	});
}
function ReceiptModal({ ticket, settings, logoUrl, onClose }) {
	const printRef = (0, import_react.useRef)(null);
	const handlePrint = () => {
		const html = printRef.current?.innerHTML;
		if (!html) return;
		const w = window.open("", "_blank", "width=380,height=640");
		if (!w) return;
		w.document.write(`<!doctype html><html><head><title>Ticket ${ticket.number}</title>
      <style>
        @page { size: 80mm auto; margin: 4mm; }
        body { font-family: 'Courier New', monospace; font-size: 12px; color:#000; margin:0; padding:0; }
        .ticket { width: 100%; max-width: 80mm; }
        .center { text-align:center; }
        .row { display:flex; justify-content:space-between; }
        .sep { border-top:1px dashed #000; margin:6px 0; }
        h1 { font-size:14px; margin:2px 0; }
        table { width:100%; border-collapse:collapse; }
        td { padding:2px 0; vertical-align:top; }
        .qty { width:22px; }
        .amt { text-align:right; white-space:nowrap; }
        .total { font-size:14px; font-weight:bold; }
      </style></head><body onload="window.print();setTimeout(()=>window.close(),300)">
      <div class="ticket">${html}</div></body></html>`);
		w.document.close();
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
			initial: {
				scale: .95,
				y: 10,
				opacity: 0
			},
			animate: {
				scale: 1,
				y: 0,
				opacity: 1
			},
			exit: {
				scale: .95,
				opacity: 0
			},
			onClick: (e) => e.stopPropagation(),
			className: "bg-background rounded-3xl shadow-2xl w-full max-w-md overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-5 py-4 border-b border-border",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-8 w-8 rounded-xl bg-green-500/10 text-green-600 grid place-items-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "font-semibold text-sm",
							children: "Vente encaissée"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-xs text-muted-foreground",
							children: ["Ticket ", ticket.number]
						})] })]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: onClose,
						className: "text-muted-foreground hover:text-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-5 w-5" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "max-h-[60vh] overflow-y-auto scrollbar-thin p-5 bg-muted/30",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						ref: printRef,
						className: "mx-auto bg-white text-black font-mono text-[12px] leading-snug p-4 shadow-md",
						style: { width: 300 },
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "center",
								children: [
									logoUrl && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
										src: logoUrl,
										alt: "Logo",
										style: {
											maxWidth: "60px",
											margin: "0 auto 5px"
										}
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
										style: {
											fontSize: 14,
											margin: "2px 0",
											fontWeight: 700
										},
										children: settings?.company_name || "MAGUY MULTI SERVICES"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: settings?.trade_name || "Imprimerie & Bureautique" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: settings?.address || "" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [settings?.city ? `${settings.city} — ` : "", settings?.phone ? `Tél. ${settings.phone}` : ""] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										settings?.email || "",
										" · ",
										settings?.website || ""
									] }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [
										settings?.tax_number ? `NINEA: ${settings.tax_number}` : "",
										" ",
										settings?.rccm ? `· RC: ${settings.rccm}` : ""
									] })
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "sep",
								style: {
									borderTop: "1px dashed #000",
									margin: "6px 0"
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "row",
								style: {
									display: "flex",
									justifyContent: "space-between"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Ticket:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ticket.number })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "row",
								style: {
									display: "flex",
									justifyContent: "space-between"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Date:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ticket.date.toLocaleString("fr-FR") })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "row",
								style: {
									display: "flex",
									justifyContent: "space-between"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Caissier:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ticket.cashier })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "row",
								style: {
									display: "flex",
									justifyContent: "space-between"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Client:" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ticket.client })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "sep",
								style: {
									borderTop: "1px dashed #000",
									margin: "6px 0"
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("table", {
								style: {
									width: "100%",
									borderCollapse: "collapse"
								},
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: ticket.items.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_react.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									style: { padding: "2px 0" },
									colSpan: 2,
									children: i.name
								}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
									style: { paddingLeft: 8 },
									children: [
										i.qty,
										" x ",
										formatNum(i.price)
									]
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
									style: { textAlign: "right" },
									children: formatNum(i.qty * i.price)
								})] })] }, i.id)) })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "sep",
								style: {
									borderTop: "1px dashed #000",
									margin: "6px 0"
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "row",
								style: {
									display: "flex",
									justifyContent: "space-between"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Sous-total" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatNum(ticket.subTotal) })]
							}),
							ticket.discount > 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "row",
								style: {
									display: "flex",
									justifyContent: "space-between"
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Remise" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { children: ["-", formatNum(ticket.discount)] })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "row total",
								style: {
									display: "flex",
									justifyContent: "space-between",
									fontWeight: 700,
									fontSize: 14,
									marginTop: 4
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "TOTAL FCFA" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatNum(ticket.total) })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "row",
								style: {
									display: "flex",
									justifyContent: "space-between",
									marginTop: 4
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Paiement" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: ticket.payment })]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "sep",
								style: {
									borderTop: "1px dashed #000",
									margin: "6px 0"
								}
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "center",
								style: { textAlign: "center" },
								children: [
									"Merci de votre visite !",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
									"À bientôt chez MMS",
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										style: { fontSize: 10 },
										children: "Ticket non remboursable"
									})
								]
							})
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-wrap gap-2 p-4 border-t border-border",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							onClick: handlePrint,
							className: "flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Printer, { className: "h-4 w-4" }), " Imprimer le ticket"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
							className: "flex-1 inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-green-500 text-white hover:opacity-90 transition",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageCircle, { className: "h-4 w-4" }), " WhatsApp"]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
							onClick: onClose,
							className: "w-full inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium bg-muted hover:bg-accent transition",
							children: "Nouvelle vente"
						})
					]
				})
			]
		})
	});
}
function formatNum(n) {
	return n.toLocaleString("fr-FR");
}
function formatFCFA(n) {
	return formatNum(n) + " FCFA";
}
var SplitComponent = PosPage;
//#endregion
export { SplitComponent as component };

import { a as __toESM } from "../_runtime.mjs";
import { t as motion } from "../_libs/framer-motion.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { g as Link, l as useRouterState } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { J as FileText, K as House, c as Truck, h as ShoppingCart, i as Users, l as TrendingUp, n as Wrench, p as Sparkles, pt as Bot, r as Wallet, t as X, w as Receipt, y as Settings } from "../_libs/lucide-react.mjs";
import { a as DialogOverlay, c as DialogTrigger, i as DialogDescription, n as DialogClose, o as DialogPortal, r as DialogContent, s as DialogTitle, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { n as cn } from "./button-B2LyfGb_.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/AssistantContext-BQCUsUwo.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function usePermissions() {
	return { data: [
		"dashboard.view",
		"assistant.use",
		"ventes.view",
		"clients.view",
		"achats.view",
		"settings.manage"
	] };
}
var items = [
	{
		icon: House,
		label: "Dashboard",
		to: "/",
		perm: "dashboard.view"
	},
	{
		icon: Bot,
		label: "Assistant IA",
		to: "/assistant",
		perm: "assistant.use"
	},
	{
		icon: Wallet,
		label: "Ventes (POS)",
		to: "/ventes",
		perm: "ventes.view"
	},
	{
		icon: FileText,
		label: "Devis",
		to: "/devis",
		perm: "ventes.view"
	},
	{
		icon: Users,
		label: "Clients",
		to: "/clients",
		perm: "clients.view"
	},
	{
		icon: Wrench,
		label: "Services",
		to: "/services",
		perm: "ventes.view"
	},
	{
		icon: ShoppingCart,
		label: "Achats",
		to: "/achats",
		perm: "achats.view"
	},
	{
		icon: Truck,
		label: "Fournisseurs",
		to: "/fournisseurs",
		perm: "achats.view"
	},
	{
		icon: Receipt,
		label: "Dépenses",
		to: "/depenses",
		perm: "ventes.view"
	},
	{
		icon: TrendingUp,
		label: "Rapports",
		to: "/rapports",
		perm: "ventes.view"
	},
	{
		icon: Settings,
		label: "Paramètres",
		to: "/parametres",
		perm: "settings.manage"
	}
];
function SidebarContent({ onItemClick }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { data: permissions = [] } = usePermissions();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		className: "flex-1 flex flex-col gap-1 mt-2",
		children: items.filter((it) => permissions.includes(it.perm)).map((it, idx) => {
			const isActive = pathname === it.to && !(it.to === "/" && idx === 0 && pathname === "/");
			const active = it.to === "/ventes" ? pathname.startsWith("/ventes") : pathname === it.to && idx !== 0 ? true : isActive;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: it.to,
				onClick: onItemClick,
				className: "relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/75 hover:text-white transition-colors",
				children: [
					active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
						layoutId: "sidebar-active",
						className: "absolute inset-0 rounded-xl bg-gradient-to-r from-primary to-primary-glow shadow-lg shadow-primary/40",
						transition: {
							type: "spring",
							stiffness: 380,
							damping: 32
						}
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(it.icon, { className: `relative h-[18px] w-[18px] ${active ? "text-white" : ""}` }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: `relative ${active ? "text-white" : ""}`,
						children: it.label
					})
				]
			}, `${it.label}-${idx}`);
		})
	});
}
function useSignedUrl(path, bucket = "company-assets") {
	const [url, setUrl] = (0, import_react.useState)(null);
	(0, import_react.useEffect)(() => {
		let alive = true;
		if (!path) {
			setUrl(null);
			return;
		}
		supabase.storage.from(bucket).createSignedUrl(path, 3600).then(({ data }) => {
			if (alive) setUrl(data?.signedUrl ?? null);
		});
		return () => {
			alive = false;
		};
	}, [path, bucket]);
	return url;
}
function useCompanySettings() {
	const { data: settings, isLoading } = useQuery({
		queryKey: ["parametres"],
		queryFn: async () => {
			const { data, error } = await supabase.from("parametres").select("*").limit(1).maybeSingle();
			if (error) throw error;
			return data;
		}
	});
	return {
		settings,
		logoUrl: useSignedUrl(settings?.logo_url ?? null),
		isLoading,
		companyName: settings?.company_name ?? "Maguy Multi Services",
		address: settings?.address ?? "",
		phone: settings?.phone ?? "",
		email: settings?.email ?? ""
	};
}
function Sidebar() {
	const { logoUrl } = useCompanySettings();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 px-4 py-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid place-items-center h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-lg shadow-primary/30 overflow-hidden",
					children: logoUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: logoUrl,
						alt: "logo",
						className: "h-full w-full object-cover rounded-2xl"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-5 w-5 text-white" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "min-w-0",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-bold tracking-tight",
						children: "MMS ERP"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-xs text-sidebar-foreground/60",
						children: "Maguy Multi Services"
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarContent, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-auto border-t border-slate-700 p-4 bg-slate-900",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary-glow grid place-items-center text-white text-sm font-bold",
						children: "B"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "min-w-0 flex-1",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-medium truncate",
							children: "Bamba"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-xs text-sidebar-foreground/60 truncate",
							children: "Administrateur"
						})]
					})]
				})
			})
		]
	});
}
var Sheet = Dialog;
var SheetTrigger = DialogTrigger;
var SheetPortal = DialogPortal;
var SheetOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
SheetOverlay.displayName = DialogOverlay.displayName;
var sheetVariants = cva("fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500 data-[state=open]:animate-in data-[state=closed]:animate-out", {
	variants: { side: {
		top: "inset-x-0 top-0 border-b data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
		bottom: "inset-x-0 bottom-0 border-t data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
		left: "inset-y-0 left-0 h-full w-3/4 border-r data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-sm",
		right: "inset-y-0 right-0 h-full w-3/4 border-l data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-sm"
	} },
	defaultVariants: { side: "right" }
});
var SheetContent = import_react.forwardRef(({ side = "right", className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SheetPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
	ref,
	className: cn(sheetVariants({ side }), className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Close"
		})]
	}), children]
})] }));
SheetContent.displayName = DialogContent.displayName;
var SheetHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
SheetHeader.displayName = "SheetHeader";
var SheetFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
SheetFooter.displayName = "SheetFooter";
var SheetTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
	ref,
	className: cn("text-lg font-semibold text-foreground", className),
	...props
}));
SheetTitle.displayName = DialogTitle.displayName;
var SheetDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
SheetDescription.displayName = DialogDescription.displayName;
var AssistantContext = (0, import_react.createContext)(void 0);
function AssistantProvider({ children }) {
	const [pageContext, setPageContext] = (0, import_react.useState)(null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AssistantContext.Provider, {
		value: {
			pageContext,
			setPageContext
		},
		children
	});
}
function useAssistantContext() {
	const context = (0, import_react.useContext)(AssistantContext);
	if (!context) throw new Error("useAssistantContext must be used within an AssistantProvider");
	return context;
}
//#endregion
export { SheetTrigger as a, useAssistantContext as c, SheetTitle as i, useCompanySettings as l, Sheet as n, Sidebar as o, SheetContent as r, SidebarContent as s, AssistantProvider as t, useSignedUrl as u };

import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { g as Link, l as useRouterState } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { E as Receipt, K as House, Y as FileText, a as Users, g as ShoppingCart, ht as Briefcase, i as Wallet, m as Sparkles, n as X, q as Handshake, u as TrendingUp, x as Settings } from "../_libs/lucide-react.mjs";
import { a as DialogOverlay, c as DialogTrigger, i as DialogDescription, n as DialogClose, o as DialogPortal, r as DialogContent, s as DialogTitle, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { n as useQuery } from "../_libs/tanstack__react-query.mjs";
import { t as useCompanySettings } from "./use-company-settings-Bqa94T5s.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { t as routePermissions } from "./route-permissions-crnID_QB.mjs";
import { t as motion } from "../_libs/framer-motion.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/sheet-HTvBjksn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function usePermissions() {
	return useQuery({
		queryKey: ["permissions"],
		queryFn: async () => {
			const { data: { user } } = await supabase.auth.getUser();
			if (!user) return [];
			const { data, error } = await supabase.from("profiles").select(`
          roles(
            name,
            role_permissions(
              permissions(code)
            )
          )
        `).eq("id", user.id).single();
			if (error || !data) return [];
			if (data.roles?.name === "Administrateur") {
				const { data: allPerms } = await supabase.from("permissions").select("code");
				return allPerms?.map((p) => p.code) || [];
			}
			return data.roles?.role_permissions?.map((rp) => rp.permissions?.code) || [];
		}
	});
}
var items = [
	{
		icon: House,
		label: "Dashboard",
		to: "/"
	},
	{
		icon: Wallet,
		label: "Ventes (POS)",
		to: "/ventes"
	},
	{
		icon: FileText,
		label: "Devis",
		to: "/devis"
	},
	{
		icon: Users,
		label: "Clients",
		to: "/clients"
	},
	{
		icon: Briefcase,
		label: "Produits & Services",
		to: "/services"
	},
	{
		icon: ShoppingCart,
		label: "Achats",
		to: "/achats"
	},
	{
		icon: Handshake,
		label: "Fournisseurs",
		to: "/fournisseurs"
	},
	{
		icon: Receipt,
		label: "Dépenses",
		to: "/depenses"
	},
	{
		icon: TrendingUp,
		label: "Rapports",
		to: "/rapports"
	},
	{
		icon: Settings,
		label: "Paramètres",
		to: "/parametres"
	}
];
function SidebarContent({ onItemClick }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	const { data: permissions = [], isLoading } = usePermissions();
	const filteredItems = items.filter((it) => {
		const requiredPermission = routePermissions[it.to];
		if (!requiredPermission) return true;
		return permissions.includes(requiredPermission);
	});
	if (isLoading) return null;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
		className: "flex-1 flex flex-col gap-1 mt-2",
		children: filteredItems.map((it, idx) => {
			const isActive = pathname === it.to && !(it.to === "/" && idx === 0 && pathname === "/");
			const active = it.to === "/ventes" ? pathname.startsWith("/ventes") : pathname === it.to && idx !== 0 ? true : isActive;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
				to: it.to,
				onClick: onItemClick,
				className: "relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/75 hover:text-white transition-colors",
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
function Sidebar() {
	const { logoUrl, settings } = useCompanySettings();
	const companyName = settings?.company_name ?? "Mon Entreprise";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "hidden md:flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center gap-2 px-2 py-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid place-items-center h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-lg shadow-primary/30 overflow-hidden",
					children: logoUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: logoUrl,
						alt: "logo",
						className: "h-full w-full object-cover rounded-2xl"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-5 w-5 text-white" })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "min-w-0",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "text-sm font-bold tracking-tight",
						children: companyName
					})
				})]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex-1 px-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SidebarContent, {})
		})]
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
//#endregion
export { Sidebar as a, SheetTrigger as i, SheetContent as n, SidebarContent as o, SheetTitle as r, Sheet as t };

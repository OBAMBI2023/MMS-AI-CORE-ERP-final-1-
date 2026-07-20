import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { c as HeadContent, d as createRouter, f as Outlet, g as Link, h as createRootRouteWithContext, j as redirect, m as createFileRoute, p as lazyRouteComponent, s as Scripts, v as useRouter } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { t as QueryClient } from "../_libs/tanstack__query-core.mjs";
import { r as QueryClientProvider } from "../_libs/tanstack__react-query.mjs";
import { t as useCompanySettings } from "./use-company-settings-X3aX6rL8.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { i as stringType, r as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/router-DnwcjHVV.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var styles_default = "/assets/styles-_Ehn-mS1.css";
function reportLovableError(error, context = {}) {
	if (typeof window === "undefined") return;
	window.__lovableEvents?.captureException?.(error, {
		source: "react_error_boundary",
		route: window.location.pathname,
		...context
	}, {
		mechanism: "react_error_boundary",
		handled: false,
		severity: "error"
	});
}
function DynamicFavicon() {
	const { logoUrl, companyName, isLoading } = useCompanySettings();
	(0, import_react.useEffect)(() => {
		if (isLoading) return;
		const favicon = document.querySelector("link[rel~='icon']");
		if (favicon && logoUrl) favicon.setAttribute("href", logoUrl);
		if (companyName) document.title = companyName;
	}, [
		logoUrl,
		companyName,
		isLoading
	]);
	return null;
}
function NotFoundComponent() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-7xl font-bold text-foreground",
					children: "404"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "mt-4 text-xl font-semibold text-foreground",
					children: "Page not found"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "The page you're looking for doesn't exist or has been moved."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "mt-6",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
						to: "/",
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Go home"
					})
				})
			]
		})
	});
}
function ErrorComponent({ error, reset }) {
	console.error(error);
	const router = useRouter();
	(0, import_react.useEffect)(() => {
		reportLovableError(error, { boundary: "tanstack_root_error_component" });
	}, [error]);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "max-w-md text-center",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-xl font-semibold tracking-tight text-foreground",
					children: "This page didn't load"
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "mt-2 text-sm text-muted-foreground",
					children: "Something went wrong on our end. You can try refreshing or head back home."
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-6 flex flex-wrap justify-center gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						onClick: () => {
							router.invalidate();
							reset();
						},
						className: "inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90",
						children: "Try again"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
						href: "/",
						className: "inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent",
						children: "Go home"
					})]
				})
			]
		})
	});
}
var Route$13 = createRootRouteWithContext()({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content: "width=device-width, initial-scale=1"
			},
			{ title: "MMS AI CORE — Assistant intelligent Maguy Multi Services" },
			{
				name: "description",
				content: "MMS AI CORE : assistant IA premium de l'ERP Maguy Multi Services. Créez factures, devis et clients par la voix ou le chat."
			},
			{
				property: "og:title",
				content: "MMS AI CORE — Assistant intelligent Maguy Multi Services"
			},
			{
				property: "og:description",
				content: "MMS AI CORE : assistant IA premium de l'ERP Maguy Multi Services. Créez factures, devis et clients par la voix ou le chat."
			},
			{
				property: "og:type",
				content: "website"
			},
			{
				name: "twitter:card",
				content: "summary_large_image"
			},
			{
				name: "twitter:title",
				content: "MMS AI CORE — Assistant intelligent Maguy Multi Services"
			},
			{
				name: "twitter:description",
				content: "MMS AI CORE : assistant IA premium de l'ERP Maguy Multi Services. Créez factures, devis et clients par la voix ou le chat."
			},
			{
				property: "og:image",
				content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/246484be-746c-400a-9d4b-48abed8b0d64/id-preview-e914f378--0600b09e-3bef-44f9-b521-6d65236b2f89.lovable.app-1784056453447.png"
			},
			{
				name: "twitter:image",
				content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/246484be-746c-400a-9d4b-48abed8b0d64/id-preview-e914f378--0600b09e-3bef-44f9-b521-6d65236b2f89.lovable.app-1784056453447.png"
			}
		],
		links: [
			{
				rel: "stylesheet",
				href: styles_default
			},
			{
				rel: "icon",
				href: "/favicon.ico",
				type: "image/x-icon"
			},
			{
				rel: "preconnect",
				href: "https://fonts.googleapis.com"
			},
			{
				rel: "preconnect",
				href: "https://fonts.gstatic.com",
				crossOrigin: "anonymous"
			},
			{
				rel: "stylesheet",
				href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
			}
		]
	}),
	shellComponent: RootShell,
	component: RootComponent,
	notFoundComponent: NotFoundComponent,
	errorComponent: ErrorComponent
});
function RootShell({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("html", {
		lang: "en",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("head", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(HeadContent, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("body", { children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Scripts, {})] })]
	});
}
function RootComponent() {
	const { queryClient } = Route$13.useRouteContext();
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(QueryClientProvider, {
		client: queryClient,
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DynamicFavicon, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Outlet, {}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
				richColors: true,
				position: "top-right"
			})
		]
	});
}
var $$splitComponentImporter$12 = () => import("./ventes-CDGUeNyj.mjs");
var Route$12 = createFileRoute("/ventes")({
	component: lazyRouteComponent($$splitComponentImporter$12, "component"),
	head: () => ({ meta: [{ title: "Point de vente — MMS AI CORE" }, {
		name: "description",
		content: "POS imprimerie : encaissement, panier et ticket de caisse."
	}] })
});
var $$splitComponentImporter$11 = () => import("./services-C0bZYDFg.mjs");
var Route$11 = createFileRoute("/services")({
	component: lazyRouteComponent($$splitComponentImporter$11, "component"),
	head: () => ({ meta: [{ title: "Services — MMS AI CORE" }, {
		name: "description",
		content: "Catalogue des services et produits."
	}] })
});
var $$splitComponentImporter$10 = () => import("./rapports-CCs42KM5.mjs");
var Route$10 = createFileRoute("/rapports")({
	component: lazyRouteComponent($$splitComponentImporter$10, "component"),
	head: () => ({ meta: [{ title: "Rapports — MMS AI CORE" }, {
		name: "description",
		content: "Tableau de bord et rapports d'activité."
	}] })
});
var $$splitComponentImporter$9 = () => import("./parametres-Bdz_1z-5.mjs");
var Route$9 = createFileRoute("/parametres")({
	component: lazyRouteComponent($$splitComponentImporter$9, "component"),
	head: () => ({ meta: [{ title: "Paramètres — MMS AI CORE" }, {
		name: "description",
		content: "Centre de configuration de l'entreprise."
	}] })
});
var $$splitComponentImporter$8 = () => import("./login-BFGpVZuq.mjs");
objectType({
	email: stringType().email("Adresse e-mail invalide"),
	password: stringType().min(8, "Le mot de passe doit contenir au moins 8 caractères")
});
var Route$8 = createFileRoute("/login")({
	component: lazyRouteComponent($$splitComponentImporter$8, "component"),
	beforeLoad: async () => {
		const { data: { session } } = await supabase.auth.getSession();
		if (session) throw redirect({ to: "/" });
	}
});
var $$splitComponentImporter$7 = () => import("./fournisseurs-Cm1badDm.mjs");
var Route$7 = createFileRoute("/fournisseurs")({
	component: lazyRouteComponent($$splitComponentImporter$7, "component"),
	head: () => ({ meta: [{ title: "Fournisseurs — MMS AI CORE" }, {
		name: "description",
		content: "Répertoire des fournisseurs."
	}] })
});
var $$splitComponentImporter$6 = () => import("./devis-BUeLpmNf.mjs");
var Route$6 = createFileRoute("/devis")({
	component: lazyRouteComponent($$splitComponentImporter$6, "component"),
	head: () => ({ meta: [{ title: "Devis — MMS AI CORE" }, {
		name: "description",
		content: "Gestion des devis clients."
	}] })
});
var $$splitComponentImporter$5 = () => import("./depenses-DvQTMdzi.mjs");
var Route$5 = createFileRoute("/depenses")({
	component: lazyRouteComponent($$splitComponentImporter$5, "component"),
	head: () => ({ meta: [{ title: "Dépenses — MMS AI CORE" }, {
		name: "description",
		content: "Suivi des dépenses."
	}] })
});
var $$splitComponentImporter$4 = () => import("./clients-BWo2lLD_.mjs");
var Route$4 = createFileRoute("/clients")({
	component: lazyRouteComponent($$splitComponentImporter$4, "component"),
	head: () => ({ meta: [{ title: "Clients — MMS AI CORE" }, {
		name: "description",
		content: "Répertoire des clients."
	}] })
});
var $$splitComponentImporter$3 = () => import("./assistant-CSu1JHxl.mjs");
var Route$3 = createFileRoute("/assistant")({ component: lazyRouteComponent($$splitComponentImporter$3, "component") });
var $$splitComponentImporter$2 = () => import("./achats-Dr5aNXjG.mjs");
var Route$2 = createFileRoute("/achats")({
	component: lazyRouteComponent($$splitComponentImporter$2, "component"),
	head: () => ({ meta: [{ title: "Achats — MMS AI CORE" }, {
		name: "description",
		content: "Suivi des achats fournisseurs."
	}] })
});
var $$splitComponentImporter$1 = () => import("./403-C8lrAjxV.mjs");
var Route$1 = createFileRoute("/403")({ component: lazyRouteComponent($$splitComponentImporter$1, "component") });
var $$splitComponentImporter = () => import("./routes-DSKfXsJo.mjs");
var Route = createFileRoute("/")({ component: lazyRouteComponent($$splitComponentImporter, "component") });
var VentesRoute = Route$12.update({
	id: "/ventes",
	path: "/ventes",
	getParentRoute: () => Route$13
});
var ServicesRoute = Route$11.update({
	id: "/services",
	path: "/services",
	getParentRoute: () => Route$13
});
var RapportsRoute = Route$10.update({
	id: "/rapports",
	path: "/rapports",
	getParentRoute: () => Route$13
});
var ParametresRoute = Route$9.update({
	id: "/parametres",
	path: "/parametres",
	getParentRoute: () => Route$13
});
var LoginRoute = Route$8.update({
	id: "/login",
	path: "/login",
	getParentRoute: () => Route$13
});
var FournisseursRoute = Route$7.update({
	id: "/fournisseurs",
	path: "/fournisseurs",
	getParentRoute: () => Route$13
});
var DevisRoute = Route$6.update({
	id: "/devis",
	path: "/devis",
	getParentRoute: () => Route$13
});
var DepensesRoute = Route$5.update({
	id: "/depenses",
	path: "/depenses",
	getParentRoute: () => Route$13
});
var ClientsRoute = Route$4.update({
	id: "/clients",
	path: "/clients",
	getParentRoute: () => Route$13
});
var AssistantRoute = Route$3.update({
	id: "/assistant",
	path: "/assistant",
	getParentRoute: () => Route$13
});
var AchatsRoute = Route$2.update({
	id: "/achats",
	path: "/achats",
	getParentRoute: () => Route$13
});
var R403Route = Route$1.update({
	id: "/403",
	path: "/403",
	getParentRoute: () => Route$13
});
var rootRouteChildren = {
	IndexRoute: Route.update({
		id: "/",
		path: "/",
		getParentRoute: () => Route$13
	}),
	R403Route,
	AchatsRoute,
	AssistantRoute,
	ClientsRoute,
	DepensesRoute,
	DevisRoute,
	FournisseursRoute,
	LoginRoute,
	ParametresRoute,
	RapportsRoute,
	ServicesRoute,
	VentesRoute
};
var routeTree = Route$13._addFileChildren(rootRouteChildren)._addFileTypes();
var getRouter = () => {
	return createRouter({
		routeTree,
		context: { queryClient: new QueryClient() },
		scrollRestoration: true,
		defaultPreloadStaleTime: 0
	});
};
//#endregion
export { getRouter };

globalThis.__nitro_main__ = import.meta.url;
import { a as FastResponse, n as HTTPError, r as defineLazyEventHandler, t as H3Core } from "./_libs/h3+rou3+srvx.mjs";
import { t as HookableCore } from "./_libs/hookable.mjs";
//#region #nitro-vite-setup
function lazyService(loader) {
	let promise, mod;
	return { fetch(req) {
		if (mod) return mod.fetch(req);
		if (!promise) promise = loader().then((_mod) => mod = _mod.default || _mod);
		return promise.then((mod) => mod.fetch(req));
	} };
}
var services = { ["ssr"]: lazyService(() => import("./_ssr/ssr.mjs")) };
globalThis.__nitro_vite_envs__ = services;
//#endregion
//#region #nitro/virtual/public-assets-data
var public_assets_data_default = {
	"/assets/403-CwSEIPVT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"594-4PvuCK7RmN0w5flaLaiYJ0LnQbU\"",
		"mtime": "2026-07-20T15:46:01.922Z",
		"size": 1428,
		"path": "../public/assets/403-CwSEIPVT.js"
	},
	"/favicon.ico": {
		"type": "image/vnd.microsoft.icon",
		"etag": "\"4f95-3RXc3p2mhEAs1WBwaIvE0Y0uu0Y\"",
		"mtime": "2026-07-15T20:43:37.000Z",
		"size": 20373,
		"path": "../public/favicon.ico"
	},
	"/assets/achats-DdBvOY7H.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1164-6L6BWxnOmyLe9WOIMM01pTAjXRA\"",
		"mtime": "2026-07-20T15:46:01.971Z",
		"size": 4452,
		"path": "../public/assets/achats-DdBvOY7H.js"
	},
	"/assets/AnimatePresence-vhpDYO20.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1116-ytBqhQcjV+KI7I7vpaKSG7c30Tg\"",
		"mtime": "2026-07-20T15:46:01.922Z",
		"size": 4374,
		"path": "../public/assets/AnimatePresence-vhpDYO20.js"
	},
	"/assets/chart-column-Bz5KetjS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fb-RaYd0Sv4dtrqjz6lTFxQ+T0TPCQ\"",
		"mtime": "2026-07-20T15:46:01.971Z",
		"size": 251,
		"path": "../public/assets/chart-column-Bz5KetjS.js"
	},
	"/assets/AppShell-DWC-hSBR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e68a-uu+f8NH4NUZNV8YfMhMPnCFhNiM\"",
		"mtime": "2026-07-20T15:46:01.937Z",
		"size": 59018,
		"path": "../public/assets/AppShell-DWC-hSBR.js"
	},
	"/assets/clients-D9jdtPaB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3d7-tjOCut5QL6QyVgX/YI+ew9Ado2o\"",
		"mtime": "2026-07-20T15:46:01.975Z",
		"size": 983,
		"path": "../public/assets/clients-D9jdtPaB.js"
	},
	"/assets/assistant-DyhPRiBK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e4-Od8D2aOJZLIdPyG9NkW3VyWWtk8\"",
		"mtime": "2026-07-20T15:46:01.971Z",
		"size": 484,
		"path": "../public/assets/assistant-DyhPRiBK.js"
	},
	"/assets/depenses-_WTJGdsG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5d4-T+NexfdIioGCrjJeZIM2i95DgCc\"",
		"mtime": "2026-07-20T15:46:01.975Z",
		"size": 1492,
		"path": "../public/assets/depenses-_WTJGdsG.js"
	},
	"/assets/format-39Lu8dHk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b6-9PlMkflK3oqFwVO7TJUoKaFFwjE\"",
		"mtime": "2026-07-20T15:46:01.979Z",
		"size": 694,
		"path": "../public/assets/format-39Lu8dHk.js"
	},
	"/assets/devis-nbCSOIxP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14e4-i04Yr6KInfb62ctKFGzEtKrP8Nw\"",
		"mtime": "2026-07-20T15:46:01.979Z",
		"size": 5348,
		"path": "../public/assets/devis-nbCSOIxP.js"
	},
	"/assets/createLucideIcon-C6JfxTWx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4d0-8y1A8+8iQLIoxLz76CehI05Gaxc\"",
		"mtime": "2026-07-20T15:46:01.975Z",
		"size": 1232,
		"path": "../public/assets/createLucideIcon-C6JfxTWx.js"
	},
	"/assets/image-CnHA0rRX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10d-omdZoZeW2I0uZVQgmB8yi2vm25I\"",
		"mtime": "2026-07-20T15:46:01.979Z",
		"size": 269,
		"path": "../public/assets/image-CnHA0rRX.js"
	},
	"/assets/client-D9wiRjjZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"32746-b0jOrKH/hBaZng2QcBFg9R2Ou3g\"",
		"mtime": "2026-07-20T15:46:01.971Z",
		"size": 206662,
		"path": "../public/assets/client-D9wiRjjZ.js"
	},
	"/assets/index-CYU2AnWm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5f1f2-bwv4fDlfPrPbNhwuS06HoRHbeTM\"",
		"mtime": "2026-07-20T15:46:01.922Z",
		"size": 389618,
		"path": "../public/assets/index-CYU2AnWm.js"
	},
	"/assets/fournisseurs-D5EVKXj4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3f0-lOLC0OGQ7UGxhT2vHD+hx0YFnN0\"",
		"mtime": "2026-07-20T15:46:01.979Z",
		"size": 1008,
		"path": "../public/assets/fournisseurs-D5EVKXj4.js"
	},
	"/assets/LineItemsDialog-B_yL_dts.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"275f-fkcUMlzOeShokvTidrRHq4AKNIA\"",
		"mtime": "2026-07-20T15:46:01.937Z",
		"size": 10079,
		"path": "../public/assets/LineItemsDialog-B_yL_dts.js"
	},
	"/assets/jsx-runtime-CZcjcDnw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4e3-jCOgwIq6oGNLw0tt5XnD3UYp7FI\"",
		"mtime": "2026-07-20T15:46:01.995Z",
		"size": 1251,
		"path": "../public/assets/jsx-runtime-CZcjcDnw.js"
	},
	"/assets/label-BAOcsWUH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"52f-EuwZdjkNhM6qlKCyMo8yF4tl5p8\"",
		"mtime": "2026-07-20T15:46:01.995Z",
		"size": 1327,
		"path": "../public/assets/label-BAOcsWUH.js"
	},
	"/assets/link-CwC-tMXX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5b02-lhdOSqpb2HwBe+DOo5w6JP2qIdc\"",
		"mtime": "2026-07-20T15:46:01.995Z",
		"size": 23298,
		"path": "../public/assets/link-CwC-tMXX.js"
	},
	"/assets/loader-circle-B0gOwy-U.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"90-yAAu5yrvdtl1LK5M9a9sPNVVUf8\"",
		"mtime": "2026-07-20T15:46:01.995Z",
		"size": 144,
		"path": "../public/assets/loader-circle-B0gOwy-U.js"
	},
	"/assets/login-Cx88wz6k.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"92c7-P2Hq93Inpw4Sf/PnbvDrABQzRjk\"",
		"mtime": "2026-07-20T15:46:01.995Z",
		"size": 37575,
		"path": "../public/assets/login-Cx88wz6k.js"
	},
	"/assets/minus-NDKNdjdz.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10f-zuTHroAR7+NeqBOSNbR0ZrKog+g\"",
		"mtime": "2026-07-20T15:46:01.995Z",
		"size": 271,
		"path": "../public/assets/minus-NDKNdjdz.js"
	},
	"/assets/pencil-BCPbFZ1Z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"114-sMEaI+HeDK6BekdWXDI4EasJeNo\"",
		"mtime": "2026-07-20T15:46:01.995Z",
		"size": 276,
		"path": "../public/assets/pencil-BCPbFZ1Z.js"
	},
	"/assets/parametres-AMJB93ve.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7930-TxdaXE4zSLSGXKrc9Phlkgr3Kok\"",
		"mtime": "2026-07-20T15:46:01.995Z",
		"size": 31024,
		"path": "../public/assets/parametres-AMJB93ve.js"
	},
	"/assets/plus-C6Vgybzt.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-XOKYzJxGp97UVg1PHAFle7znJC4\"",
		"mtime": "2026-07-20T15:46:01.995Z",
		"size": 153,
		"path": "../public/assets/plus-C6Vgybzt.js"
	},
	"/assets/rapports-Dyf9Xr1o.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12ea-dDC7sg43C4/94HREICqze4L9GxQ\"",
		"mtime": "2026-07-20T15:46:02.011Z",
		"size": 4842,
		"path": "../public/assets/rapports-Dyf9Xr1o.js"
	},
	"/assets/ResourceTable-BV0j-qCo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b14-rmueVlTaWLRz41NsIdeDJppMDVE\"",
		"mtime": "2026-07-20T15:46:01.937Z",
		"size": 6932,
		"path": "../public/assets/ResourceTable-BV0j-qCo.js"
	},
	"/assets/select-CKFeRnst.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"574d-0IqNZwndb5rumkjLP9sk2lwj9Fs\"",
		"mtime": "2026-07-20T15:46:02.011Z",
		"size": 22349,
		"path": "../public/assets/select-CKFeRnst.js"
	},
	"/assets/proxy-DfuNYQtH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"255b8-xrbizWZfTqV29ihBAVAub06dNZQ\"",
		"mtime": "2026-07-20T15:46:02.011Z",
		"size": 153016,
		"path": "../public/assets/proxy-DfuNYQtH.js"
	},
	"/assets/sheet-DanNNgFH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"93bf-nI1jAFeSJo7KvCFRhA9+Le6+Wos\"",
		"mtime": "2026-07-20T15:46:02.011Z",
		"size": 37823,
		"path": "../public/assets/sheet-DanNNgFH.js"
	},
	"/assets/services-DErf8p58.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4ec-BURICIX8AydDxxPIiPQLwhDX0TI\"",
		"mtime": "2026-07-20T15:46:02.011Z",
		"size": 1260,
		"path": "../public/assets/services-DErf8p58.js"
	},
	"/assets/tabs-B7zsZN0g.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ee6-S9ejABdHuxl847Ob+DNJV/n84Ks\"",
		"mtime": "2026-07-20T15:46:02.019Z",
		"size": 3814,
		"path": "../public/assets/tabs-B7zsZN0g.js"
	},
	"/assets/styles-_Ehn-mS1.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"18c80-x3iEUsoIKkUQFaVQ9mQahkuwcTc\"",
		"mtime": "2026-07-20T15:46:02.037Z",
		"size": 101504,
		"path": "../public/assets/styles-_Ehn-mS1.css"
	},
	"/assets/trash-2-ChR3Wq9P.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"148-svGHfNLSqKAakZANYlOA8WJxdfk\"",
		"mtime": "2026-07-20T15:46:02.019Z",
		"size": 328,
		"path": "../public/assets/trash-2-ChR3Wq9P.js"
	},
	"/assets/useRouter-DChMTBBJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b5d-9xI1xKkvaEYDM96bNgUVjxWwPs8\"",
		"mtime": "2026-07-20T15:46:02.037Z",
		"size": 11101,
		"path": "../public/assets/useRouter-DChMTBBJ.js"
	},
	"/assets/use-company-settings-D4QNGOFF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6157-FA16atDdRm4HMKzvjx9JawqpY3M\"",
		"mtime": "2026-07-20T15:46:02.019Z",
		"size": 24919,
		"path": "../public/assets/use-company-settings-D4QNGOFF.js"
	},
	"/assets/useMutation-C6omHm7P.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"91f-gX4ftXglOHC0J8ew1oADDbJfIDQ\"",
		"mtime": "2026-07-20T15:46:02.037Z",
		"size": 2335,
		"path": "../public/assets/useMutation-C6omHm7P.js"
	},
	"/assets/routes-By2_51ig.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7327c-D4XCkxEclvy7yf1awIiMMNdtrbU\"",
		"mtime": "2026-07-20T15:46:02.011Z",
		"size": 471676,
		"path": "../public/assets/routes-By2_51ig.js"
	},
	"/assets/ventes-5yLQ8NdO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"552a-A1wDCKHbajb5uzHSFHK/mguzwb4\"",
		"mtime": "2026-07-20T15:46:02.037Z",
		"size": 21802,
		"path": "../public/assets/ventes-5yLQ8NdO.js"
	}
};
//#endregion
//#region #nitro/virtual/public-assets
var publicAssetBases = {};
function isPublicAssetURL(id = "") {
	if (public_assets_data_default[id]) return true;
	for (const base in publicAssetBases) if (id.startsWith(base)) return true;
	return false;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/route-rules.mjs
var headers = ((m) => function headersRouteRule(event) {
	for (const [key, value] of Object.entries(m.options || {})) event.res.headers.set(key, value);
});
//#endregion
//#region #nitro/virtual/routing
var findRouteRules = /* @__PURE__ */ (() => {
	const $0 = [{
		name: "headers",
		route: "/assets/**",
		handler: headers,
		options: { "cache-control": "public, max-age=31536000, immutable" }
	}];
	return (m, p) => {
		let r = [];
		if (p.charCodeAt(p.length - 1) === 47) p = p.slice(0, -1) || "/";
		let s = p.split("/");
		if (s.length > 1) {
			if (s[1] === "assets") r.unshift({
				data: $0,
				params: { "_": s.slice(2).join("/") }
			});
		}
		return r;
	};
})();
var _lazy_TQkvcI = defineLazyEventHandler(() => import("./_chunks/ssr-renderer.mjs"));
var findRoute = /* @__PURE__ */ (() => {
	const data = {
		route: "/**",
		handler: _lazy_TQkvcI
	};
	return ((_m, p) => {
		return {
			data,
			params: { "_": p.slice(1) }
		};
	});
})();
[].filter(Boolean);
//#endregion
//#region node_modules/nitro/dist/runtime/internal/error/prod.mjs
var errorHandler = (error, event) => {
	const res = defaultHandler(error, event);
	return new FastResponse(typeof res.body === "string" ? res.body : JSON.stringify(res.body, null, 2), res);
};
function defaultHandler(error, event) {
	const unhandled = error.unhandled ?? !HTTPError.isError(error);
	const { status = 500, statusText = "" } = unhandled ? {} : error;
	if (status === 404) {
		const url = event.url || new URL(event.req.url);
		const baseURL = "/";
		if (/^\/[^/]/.test(baseURL) && !url.pathname.startsWith(baseURL)) return {
			status: 302,
			headers: new Headers({ location: `${baseURL}${url.pathname.slice(1)}${url.search}` })
		};
	}
	const headers = new Headers(unhandled ? {} : error.headers);
	headers.set("content-type", "application/json; charset=utf-8");
	return {
		status,
		statusText,
		headers,
		body: {
			error: true,
			...unhandled ? {
				status,
				unhandled: true
			} : typeof error.toJSON === "function" ? error.toJSON() : {
				status,
				statusText,
				message: error.message
			}
		}
	};
}
//#endregion
//#region #nitro/virtual/error-handler
var errorHandlers = [errorHandler];
async function error_handler_default(error, event) {
	for (const handler of errorHandlers) try {
		const response = await handler(error, event, { defaultHandler });
		if (response) return response;
	} catch (error) {
		console.error(error);
	}
}
//#endregion
//#region #nitro/virtual/app
function createNitroApp() {
	const captureError = (error, errorCtx) => {
		if (errorCtx?.event) {
			const errors = errorCtx.event.req.context?.nitro?.errors;
			if (errors) errors.push({
				error,
				context: errorCtx
			});
		}
	};
	const h3App = createH3App({ onError(error, event) {
		return error_handler_default(error, event);
	} });
	let appHandler = (req) => {
		req.context ||= {};
		req.context.nitro = req.context.nitro || { errors: [] };
		return h3App.fetch(req);
	};
	return {
		fetch: appHandler,
		h3: h3App,
		hooks: void 0,
		captureError
	};
}
function createH3App(config) {
	const h3App = new H3Core(config);
	h3App["~findRoute"] = (event) => findRoute(event.req.method, event.url.pathname);
	h3App["~getMiddleware"] = (event, route) => {
		const pathname = event.url.pathname;
		const method = event.req.method;
		const middleware = [];
		const routeRules = getRouteRules(method, pathname);
		event.context.routeRules = routeRules?.routeRules;
		if (routeRules?.routeRuleMiddleware.length) middleware.push(...routeRules.routeRuleMiddleware);
		if (route?.data?.middleware?.length) middleware.push(...route.data.middleware);
		return middleware;
	};
	return h3App;
}
//#endregion
//#region node_modules/nitro/dist/runtime/internal/app.mjs
var APP_ID = "default";
function useNitroApp() {
	let instance = useNitroApp._instance;
	if (instance) return instance;
	instance = useNitroApp._instance = createNitroApp();
	globalThis.__nitro__ = globalThis.__nitro__ || {};
	globalThis.__nitro__[APP_ID] = instance;
	return instance;
}
function useNitroHooks() {
	const nitroApp = useNitroApp();
	const hooks = nitroApp.hooks;
	if (hooks) return hooks;
	return nitroApp.hooks = new HookableCore();
}
function getRouteRules(method, pathname) {
	const m = findRouteRules(method, pathname);
	if (!m?.length) return { routeRuleMiddleware: [] };
	const routeRules = {};
	for (const layer of m) for (const rule of layer.data) {
		const currentRule = routeRules[rule.name];
		if (currentRule) {
			if (rule.options === false) {
				delete routeRules[rule.name];
				continue;
			}
			if (typeof currentRule.options === "object" && typeof rule.options === "object") currentRule.options = {
				...currentRule.options,
				...rule.options
			};
			else currentRule.options = rule.options;
			currentRule.route = rule.route;
			currentRule.params = {
				...currentRule.params,
				...layer.params
			};
		} else if (rule.options !== false) routeRules[rule.name] = {
			...rule,
			params: layer.params
		};
	}
	const middleware = [];
	const orderedRules = Object.values(routeRules).sort((a, b) => (a.handler?.order || 0) - (b.handler?.order || 0));
	for (const rule of orderedRules) {
		if (rule.options === false || !rule.handler) continue;
		middleware.push(rule.handler(rule));
	}
	return {
		routeRules,
		routeRuleMiddleware: middleware
	};
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/_module-handler.mjs
function createHandler(hooks) {
	const nitroApp = useNitroApp();
	const nitroHooks = useNitroHooks();
	return {
		async fetch(request, env, context) {
			globalThis.__env__ = env;
			augmentReq(request, {
				env,
				context
			});
			const ctxExt = {};
			const url = new URL(request.url);
			if (hooks.fetch) {
				const res = await hooks.fetch(request, env, context, url, ctxExt);
				if (res) return res;
			}
			return await nitroApp.fetch(request);
		},
		scheduled(controller, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:scheduled", {
				controller,
				env,
				context
			}) || Promise.resolve());
		},
		email(message, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:email", {
				message,
				event: message,
				env,
				context
			}) || Promise.resolve());
		},
		queue(batch, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:queue", {
				batch,
				event: batch,
				env,
				context
			}) || Promise.resolve());
		},
		tail(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:tail", {
				traces,
				env,
				context
			}) || Promise.resolve());
		},
		trace(traces, env, context) {
			globalThis.__env__ = env;
			context.waitUntil(nitroHooks.callHook("cloudflare:trace", {
				traces,
				env,
				context
			}) || Promise.resolve());
		}
	};
}
function augmentReq(cfReq, ctx) {
	const req = cfReq;
	req.ip = cfReq.headers.get("cf-connecting-ip") || void 0;
	req.runtime ??= { name: "cloudflare" };
	req.runtime.cloudflare = {
		...req.runtime.cloudflare,
		...ctx
	};
	req.waitUntil = ctx.context?.waitUntil.bind(ctx.context);
}
//#endregion
//#region node_modules/nitro/dist/presets/cloudflare/runtime/cloudflare-module.mjs
var cloudflare_module_default = createHandler({ fetch(cfRequest, env, context, url) {
	if (env.ASSETS && isPublicAssetURL(url.pathname)) return env.ASSETS.fetch(cfRequest);
} });
//#endregion
export { cloudflare_module_default as default };

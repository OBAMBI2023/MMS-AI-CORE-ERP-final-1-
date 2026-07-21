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
	"/favicon.ico": {
		"type": "image/vnd.microsoft.icon",
		"etag": "\"4f95-3RXc3p2mhEAs1WBwaIvE0Y0uu0Y\"",
		"mtime": "2026-07-15T20:43:37.000Z",
		"size": 20373,
		"path": "../public/favicon.ico"
	},
	"/assets/403-LiPzjMto.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"594-4LbA0k81a7ZB8E/8dUftUlJSWTM\"",
		"mtime": "2026-07-21T21:46:17.425Z",
		"size": 1428,
		"path": "../public/assets/403-LiPzjMto.js"
	},
	"/assets/AppShell-Ci78uF7s.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e841-jwOXl/Gk/WTQBQ7CKhAytbOFA0w\"",
		"mtime": "2026-07-21T21:46:17.426Z",
		"size": 59457,
		"path": "../public/assets/AppShell-Ci78uF7s.js"
	},
	"/assets/achats-CVoI6ahG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1152-gr0z6UvO0EbedpRXYg9jvt6ojW8\"",
		"mtime": "2026-07-21T21:46:17.428Z",
		"size": 4434,
		"path": "../public/assets/achats-CVoI6ahG.js"
	},
	"/assets/AnimatePresence-CnLE2PVQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1147-PquKLH6MXeJySZhf48OgKFrKLBE\"",
		"mtime": "2026-07-21T21:46:17.426Z",
		"size": 4423,
		"path": "../public/assets/AnimatePresence-CnLE2PVQ.js"
	},
	"/assets/assistant-2l4XiOb9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e4-ohfrsYcOL1/xNjYRi6W4/acFUQM\"",
		"mtime": "2026-07-21T21:46:17.428Z",
		"size": 484,
		"path": "../public/assets/assistant-2l4XiOb9.js"
	},
	"/assets/chart-column-jv3tKCWy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fb-5qWneJt13HBCVnDzZh3mvo5UKXo\"",
		"mtime": "2026-07-21T21:46:17.429Z",
		"size": 251,
		"path": "../public/assets/chart-column-jv3tKCWy.js"
	},
	"/assets/clients-EUHqbJf5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3d7-JlPvcJykrTMNv2RpHkS7v6tu/ZE\"",
		"mtime": "2026-07-21T21:46:17.429Z",
		"size": 983,
		"path": "../public/assets/clients-EUHqbJf5.js"
	},
	"/assets/createLucideIcon-DM-UWzhm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4d5-SdcZioM8A8KpopYriqpQ+ewMF5g\"",
		"mtime": "2026-07-21T21:46:17.429Z",
		"size": 1237,
		"path": "../public/assets/createLucideIcon-DM-UWzhm.js"
	},
	"/assets/depenses-Cw8awlaK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5d4-KYK76GecwazzToF38TM5dT4EmEk\"",
		"mtime": "2026-07-21T21:46:17.430Z",
		"size": 1492,
		"path": "../public/assets/depenses-Cw8awlaK.js"
	},
	"/assets/fournisseurs-zVrQ4vJb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3f0-hYDkk60Z9EUr6ENVqx/oV9rcjeg\"",
		"mtime": "2026-07-21T21:46:17.432Z",
		"size": 1008,
		"path": "../public/assets/fournisseurs-zVrQ4vJb.js"
	},
	"/assets/format-39Lu8dHk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b6-9PlMkflK3oqFwVO7TJUoKaFFwjE\"",
		"mtime": "2026-07-21T21:46:17.432Z",
		"size": 694,
		"path": "../public/assets/format-39Lu8dHk.js"
	},
	"/assets/image-CGFpfkL3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10d-vEq/OFy10YJsOVfqA2yrMQF7pF8\"",
		"mtime": "2026-07-21T21:46:17.432Z",
		"size": 269,
		"path": "../public/assets/image-CGFpfkL3.js"
	},
	"/assets/label-C_HcFKZj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"560-P89LNbN0EcTNwlsWQTsn7wAe0O8\"",
		"mtime": "2026-07-21T21:46:17.432Z",
		"size": 1376,
		"path": "../public/assets/label-C_HcFKZj.js"
	},
	"/assets/devis-D3BnOocO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6aafc-lNFZ6VjMczjEYBylUl6zyO95BYI\"",
		"mtime": "2026-07-21T21:46:17.430Z",
		"size": 436988,
		"path": "../public/assets/devis-D3BnOocO.js"
	},
	"/assets/jsx-runtime-DiK4U9sA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b3-wXxXyswNhndByM42wnD5/FJtWq0\"",
		"mtime": "2026-07-21T21:46:17.432Z",
		"size": 435,
		"path": "../public/assets/jsx-runtime-DiK4U9sA.js"
	},
	"/assets/html2canvas-CshxQvNN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30b8d-nt1FVLhcCKhaGHjxZjLX/QCcQ60\"",
		"mtime": "2026-07-21T21:46:17.432Z",
		"size": 199565,
		"path": "../public/assets/html2canvas-CshxQvNN.js"
	},
	"/assets/LineItemsDialog-do1B2mh4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2743-LkqGiA3x7+Zjr9h/yoaI96btMl4\"",
		"mtime": "2026-07-21T21:46:17.427Z",
		"size": 10051,
		"path": "../public/assets/LineItemsDialog-do1B2mh4.js"
	},
	"/assets/link-Ciyz5k9T.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5b24-aJ8mCGvjbGKvh8eKqLegdN9YbF4\"",
		"mtime": "2026-07-21T21:46:17.436Z",
		"size": 23332,
		"path": "../public/assets/link-Ciyz5k9T.js"
	},
	"/assets/loader-circle-BEKnbrQl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"90-W44rdYaW/pZkCi1HOKehievWqrA\"",
		"mtime": "2026-07-21T21:46:17.436Z",
		"size": 144,
		"path": "../public/assets/loader-circle-BEKnbrQl.js"
	},
	"/assets/minus-DOr9oIAQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10f-MnYeibYCWf4E3wtZRqU3rE8Uz5w\"",
		"mtime": "2026-07-21T21:46:17.437Z",
		"size": 271,
		"path": "../public/assets/minus-DOr9oIAQ.js"
	},
	"/assets/parametres-QCdaWAyR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"793f-KnkZCVJms9mKbaKx59Emdu0Q5IA\"",
		"mtime": "2026-07-21T21:46:17.438Z",
		"size": 31039,
		"path": "../public/assets/parametres-QCdaWAyR.js"
	},
	"/assets/index.es-DCvMcLJC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f45-GJz/6EQZwn/GVLHcSaepD1ZxmdE\"",
		"mtime": "2026-07-21T21:46:17.432Z",
		"size": 151365,
		"path": "../public/assets/index.es-DCvMcLJC.js"
	},
	"/assets/login-CAyMEO0Q.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9901-4glcQLurWqh2W7DJya69WN0/pV0\"",
		"mtime": "2026-07-21T21:46:17.437Z",
		"size": 39169,
		"path": "../public/assets/login-CAyMEO0Q.js"
	},
	"/assets/index-DqoC1uz_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"572fb-D6v+e3ZGhQrsUh7iJkjt40tWWgE\"",
		"mtime": "2026-07-21T21:46:17.424Z",
		"size": 357115,
		"path": "../public/assets/index-DqoC1uz_.js"
	},
	"/assets/plus-CG9jMEPh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-mwQLGdoxfCwZqmHaSI5jEjCGdCo\"",
		"mtime": "2026-07-21T21:46:17.439Z",
		"size": 153,
		"path": "../public/assets/plus-CG9jMEPh.js"
	},
	"/assets/pencil-C6phdlki.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"114-wMYq/Ij5tyFW0cbpp/lKvcKqB0o\"",
		"mtime": "2026-07-21T21:46:17.438Z",
		"size": 276,
		"path": "../public/assets/pencil-C6phdlki.js"
	},
	"/assets/rolldown-runtime-CNC7AqOf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"36f-poL7VEo+W3rlEpE8cNtjWDVI11g\"",
		"mtime": "2026-07-21T21:46:17.441Z",
		"size": 879,
		"path": "../public/assets/rolldown-runtime-CNC7AqOf.js"
	},
	"/assets/purify.es-DuRL7t6i.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68ff-UzqdquwlS23jMr/0lDNWmxy5AL0\"",
		"mtime": "2026-07-21T21:46:17.440Z",
		"size": 26879,
		"path": "../public/assets/purify.es-DuRL7t6i.js"
	},
	"/assets/ResourceTable-BQLpOlLj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1af8-cDQDAAvL65lymndzfhho1cKZF+I\"",
		"mtime": "2026-07-21T21:46:17.427Z",
		"size": 6904,
		"path": "../public/assets/ResourceTable-BQLpOlLj.js"
	},
	"/assets/rapports-BK5qf118.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12f9-4elIXaGr7eCNnZxJJ1ZF+6jqHGo\"",
		"mtime": "2026-07-21T21:46:17.440Z",
		"size": 4857,
		"path": "../public/assets/rapports-BK5qf118.js"
	},
	"/assets/proxy-CW775x6L.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"255da-ALBpqRsa354LymMP4b4e6uNHp8o\"",
		"mtime": "2026-07-21T21:46:17.439Z",
		"size": 153050,
		"path": "../public/assets/proxy-CW775x6L.js"
	},
	"/assets/select-DAHf2jP_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5783-a+ZVbnfWOkFbBmaj0MOO4gps+3E\"",
		"mtime": "2026-07-21T21:46:17.442Z",
		"size": 22403,
		"path": "../public/assets/select-DAHf2jP_.js"
	},
	"/assets/services-B6-RTCRW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"502-GqT/9HsVUXaD8MMemLv1Y9cOLZs\"",
		"mtime": "2026-07-21T21:46:17.442Z",
		"size": 1282,
		"path": "../public/assets/services-B6-RTCRW.js"
	},
	"/assets/sheet-DhHSI_cb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9402-Hh3CwdDTAMp+k66rTSxHghxQqPM\"",
		"mtime": "2026-07-21T21:46:17.442Z",
		"size": 37890,
		"path": "../public/assets/sheet-DhHSI_cb.js"
	},
	"/assets/tabs-DrqeB4dq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f17-QvN/tA4OROWfgwT2tHdZQadMUEc\"",
		"mtime": "2026-07-21T21:46:17.443Z",
		"size": 3863,
		"path": "../public/assets/tabs-DrqeB4dq.js"
	},
	"/assets/trash-2-p206gH-i.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"148-VbKCqa5xMWRSsuZq8C5Pkns7oS8\"",
		"mtime": "2026-07-21T21:46:17.443Z",
		"size": 328,
		"path": "../public/assets/trash-2-p206gH-i.js"
	},
	"/assets/styles-CsauvJE1.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"192ec-uETgBmCSRZ0qSz2pY78p24beR1g\"",
		"mtime": "2026-07-21T21:46:17.447Z",
		"size": 103148,
		"path": "../public/assets/styles-CsauvJE1.css"
	},
	"/assets/typeof-B5XbjTb1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10f-yPXEOGyFHb1Ws7OoWyWNEEBz4mQ\"",
		"mtime": "2026-07-21T21:46:17.444Z",
		"size": 271,
		"path": "../public/assets/typeof-B5XbjTb1.js"
	},
	"/assets/use-company-settings-9wHeoCb0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"406b6-9xFHyJ3LuvBUNl6z3g+cxGZB8M0\"",
		"mtime": "2026-07-21T21:46:17.445Z",
		"size": 263862,
		"path": "../public/assets/use-company-settings-9wHeoCb0.js"
	},
	"/assets/routes-DIgWGHGZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7347c-hMFaKdZcqYh6WItZIH9pnmpNMDc\"",
		"mtime": "2026-07-21T21:46:17.441Z",
		"size": 472188,
		"path": "../public/assets/routes-DIgWGHGZ.js"
	},
	"/assets/useMatch-CDt0BWLJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"298-RsHFHaZW0mCIjM8d1ZuCVq7b2Ag\"",
		"mtime": "2026-07-21T21:46:17.446Z",
		"size": 664,
		"path": "../public/assets/useMatch-CDt0BWLJ.js"
	},
	"/assets/useMutation-Cw-hz7IH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"924-qk4ZIk7fYJn2H/+89jS8s0V5esg\"",
		"mtime": "2026-07-21T21:46:17.446Z",
		"size": 2340,
		"path": "../public/assets/useMutation-Cw-hz7IH.js"
	},
	"/assets/useNavigate-DOPbiivI.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e9-A5pjea5b1ZEET6LuxbMc/Gy7XXU\"",
		"mtime": "2026-07-21T21:46:17.446Z",
		"size": 233,
		"path": "../public/assets/useNavigate-DOPbiivI.js"
	},
	"/assets/useRouter-DdFbOaah.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b5d-DM7mqEDSFFD9fHp+06lPha59PAU\"",
		"mtime": "2026-07-21T21:46:17.446Z",
		"size": 11101,
		"path": "../public/assets/useRouter-DdFbOaah.js"
	},
	"/assets/ventes-Bnc-AxOm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"551d-EUhjhWBiDSiZwxUxvKNA1goIY6o\"",
		"mtime": "2026-07-21T21:46:17.447Z",
		"size": 21789,
		"path": "../public/assets/ventes-Bnc-AxOm.js"
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

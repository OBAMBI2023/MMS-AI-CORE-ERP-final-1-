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
	"/assets/AnimatePresence-aLHK_bix.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"105a-fOTA/mR/rbcvjA3hYvejwriyfW8\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 4186,
		"path": "../public/assets/AnimatePresence-aLHK_bix.js"
	},
	"/assets/403-CSJSDyHS.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"594-66RYMgE4orIKdCKIDiOlqT5vit4\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 1428,
		"path": "../public/assets/403-CSJSDyHS.js"
	},
	"/assets/achats-dpxNzGwZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1140-komW1HyYNob26hoJfek9KLjBEGk\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 4416,
		"path": "../public/assets/achats-dpxNzGwZ.js"
	},
	"/favicon.ico": {
		"type": "image/vnd.microsoft.icon",
		"etag": "\"4f95-3RXc3p2mhEAs1WBwaIvE0Y0uu0Y\"",
		"mtime": "2026-07-15T20:43:37.000Z",
		"size": 20373,
		"path": "../public/favicon.ico"
	},
	"/assets/assistant-BJ3j1434.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"36c-Cr/b/0kwioaECbL7N6Dhwy8y2Kc\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 876,
		"path": "../public/assets/assistant-BJ3j1434.js"
	},
	"/assets/AppShell-9DlKqdp3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"dbf7-oN3drEqI92OPPAzIZZDEis054/o\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 56311,
		"path": "../public/assets/AppShell-9DlKqdp3.js"
	},
	"/assets/AssistantPage-BwKaT5k7.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2422-j6yigMfAZTMhegNjetp21Io7DBA\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 9250,
		"path": "../public/assets/AssistantPage-BwKaT5k7.js"
	},
	"/assets/clients-BkSL_DCp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3d7-UsOxTJ9++vB0B1gMjlZySTGVR+g\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 983,
		"path": "../public/assets/clients-BkSL_DCp.js"
	},
	"/assets/depenses-D1AAydks.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5d4-FSKbVPh/qhJ2srYlYgMYSQv8Swc\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 1492,
		"path": "../public/assets/depenses-D1AAydks.js"
	},
	"/assets/createLucideIcon-B_1GbDvl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4ab-Y4enwiXY2yAcF1Gu2b12sxHBTW8\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 1195,
		"path": "../public/assets/createLucideIcon-B_1GbDvl.js"
	},
	"/assets/devis-CQ5o9QnV.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"14c0-CrlH7VBoIjeX5XUpR1sGMNvs3Ys\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 5312,
		"path": "../public/assets/devis-CQ5o9QnV.js"
	},
	"/assets/dialog-C6M2QkF1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"164d-+zZbRZ3+xYHBeIGz9LX0Upx/NbQ\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 5709,
		"path": "../public/assets/dialog-C6M2QkF1.js"
	},
	"/assets/AssistantContext-_FiQAfrm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"297a2-hXnZuX27aUKO8Y9jNWW/ES7s7TM\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 169890,
		"path": "../public/assets/AssistantContext-_FiQAfrm.js"
	},
	"/assets/format-39Lu8dHk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b6-9PlMkflK3oqFwVO7TJUoKaFFwjE\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 694,
		"path": "../public/assets/format-39Lu8dHk.js"
	},
	"/assets/dist-C8ghja_4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7c85-IhiKTHMvqQGbhrNFhlPWAUXCPmQ\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 31877,
		"path": "../public/assets/dist-C8ghja_4.js"
	},
	"/assets/jsx-runtime-D8nDyRPw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2210-qrBAUPDOR8ROKpBVNEla8AGnGKU\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 8720,
		"path": "../public/assets/jsx-runtime-D8nDyRPw.js"
	},
	"/assets/image-Bou9pMcM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10d-AhLgaATi8HjvKKOGSH59kLmjBbk\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 269,
		"path": "../public/assets/image-Bou9pMcM.js"
	},
	"/assets/fournisseurs-CJQt19MN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3f0-nANZLUr+XCtmE4fg7td344k+GRE\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 1008,
		"path": "../public/assets/fournisseurs-CJQt19MN.js"
	},
	"/assets/label-KDCkCvyv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"43b-fKVR9YXQvapSCUe4CiMV0HXjlK8\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 1083,
		"path": "../public/assets/label-KDCkCvyv.js"
	},
	"/assets/createServerFn-BrCNzFdO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1123-h+FUj5qGzSap0dY7bJ8zHGAzHfY\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 4387,
		"path": "../public/assets/createServerFn-BrCNzFdO.js"
	},
	"/assets/link-wS-2dCHQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5b02-Qf4ahLipx+OyTVf/IaeRBXEG+0k\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 23298,
		"path": "../public/assets/link-wS-2dCHQ.js"
	},
	"/assets/loader-circle-D8psbp0G.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"90-Acq+TaQonHAGEyTPCObIqaAAS2c\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 144,
		"path": "../public/assets/loader-circle-D8psbp0G.js"
	},
	"/assets/LineItemsDialog-DgnFyrbm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"26d7-vKlvmTIlcVWNjah4NWSgf1Pcvv4\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 9943,
		"path": "../public/assets/LineItemsDialog-DgnFyrbm.js"
	},
	"/assets/login-CEZwGMgx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"858-/jxShQFHNj90BjI0xEYcv0Er4Ew\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 2136,
		"path": "../public/assets/login-CEZwGMgx.js"
	},
	"/assets/index-B2cN1oQl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"87b0f-/DLmCXEgDUiOnCm5xiWlJBUzPuM\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 555791,
		"path": "../public/assets/index-B2cN1oQl.js"
	},
	"/assets/minus-WMiAviHF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10f-giKZirQMVNS+opJkCl2oICjGu48\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 271,
		"path": "../public/assets/minus-WMiAviHF.js"
	},
	"/assets/parametres-B68g6N4L.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d4e4-ET37Ob6UfRHegTj5ZKuo9WXYIqk\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 54500,
		"path": "../public/assets/parametres-B68g6N4L.js"
	},
	"/assets/pencil-D8-O6l_B.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"114-qXhBf4OI6TVHeVurqpCYQkm7K8M\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 276,
		"path": "../public/assets/pencil-D8-O6l_B.js"
	},
	"/assets/plus-Fr4wl8yn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-MATXIijJVHHyX2n8wxJIwEmY3e8\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 153,
		"path": "../public/assets/plus-Fr4wl8yn.js"
	},
	"/assets/rapports-CA3KPFKf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fe6-vIFXc9/30BRmRLnw6EyApxOkIqc\"",
		"mtime": "2026-07-19T16:49:20.055Z",
		"size": 4070,
		"path": "../public/assets/rapports-CA3KPFKf.js"
	},
	"/assets/ResourceTable-PzP9XU3O.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1aae-VxMepP9JweIaIQ2b5s19sWqMRhk\"",
		"mtime": "2026-07-19T16:49:20.039Z",
		"size": 6830,
		"path": "../public/assets/ResourceTable-PzP9XU3O.js"
	},
	"/assets/search-Df6DAPEk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"ae-J1NUh97cvopnFZUMvwgNzT/Pf4E\"",
		"mtime": "2026-07-19T16:49:20.058Z",
		"size": 174,
		"path": "../public/assets/search-Df6DAPEk.js"
	},
	"/assets/services-COEhxghr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4ec-T/321xg/BdLIcAsDjsfOpRz06RA\"",
		"mtime": "2026-07-19T16:49:20.058Z",
		"size": 1260,
		"path": "../public/assets/services-COEhxghr.js"
	},
	"/assets/trash-2-o5ryXRPO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"148-ykHYcMQa0yGbxHsiWGvl2HLFAGk\"",
		"mtime": "2026-07-19T16:49:20.059Z",
		"size": 328,
		"path": "../public/assets/trash-2-o5ryXRPO.js"
	},
	"/assets/useMutation-BCgHsMLO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8ca-EGpWNaZ6FhUgJv9TvPmt6I7179Y\"",
		"mtime": "2026-07-19T16:49:20.059Z",
		"size": 2250,
		"path": "../public/assets/useMutation-BCgHsMLO.js"
	},
	"/assets/styles-BpzyxIsh.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"183b5-wYSbjI3/1lbu2yKpnYBiLZVCbPw\"",
		"mtime": "2026-07-19T16:49:20.062Z",
		"size": 99253,
		"path": "../public/assets/styles-BpzyxIsh.css"
	},
	"/assets/user-plus-CMrfcDwN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"136-uIMmlc8qbiAbUZQYJagpOLjepyM\"",
		"mtime": "2026-07-19T16:49:20.060Z",
		"size": 310,
		"path": "../public/assets/user-plus-CMrfcDwN.js"
	},
	"/assets/routes-roylZEhj.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"77817-D2u/5ClQQPZBKduabbTipm3Jg9I\"",
		"mtime": "2026-07-19T16:49:20.057Z",
		"size": 489495,
		"path": "../public/assets/routes-roylZEhj.js"
	},
	"/assets/useRouter-Bpv7Ojc1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e37-K394Yige2G35/UFCbj0VQLz6JXA\"",
		"mtime": "2026-07-19T16:49:20.060Z",
		"size": 3639,
		"path": "../public/assets/useRouter-Bpv7Ojc1.js"
	},
	"/assets/ventes-Ct4AWI9A.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5613-PJZzWZfgxegSUn2NAcx3N8LPmKI\"",
		"mtime": "2026-07-19T16:49:20.061Z",
		"size": 22035,
		"path": "../public/assets/ventes-Ct4AWI9A.js"
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

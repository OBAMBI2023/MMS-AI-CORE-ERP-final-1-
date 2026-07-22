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
	"/assets/403-C2YvYbOm.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"594-/pl3WtwZds1i1/6xvn9fV5gNjE0\"",
		"mtime": "2026-07-22T01:18:43.039Z",
		"size": 1428,
		"path": "../public/assets/403-C2YvYbOm.js"
	},
	"/assets/AnimatePresence-3SlwNbql.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"113e-0vvh9tDPN/HNO329VXZgMYBZzt0\"",
		"mtime": "2026-07-22T01:18:43.039Z",
		"size": 4414,
		"path": "../public/assets/AnimatePresence-3SlwNbql.js"
	},
	"/assets/assistant-2l4XiOb9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e4-ohfrsYcOL1/xNjYRi6W4/acFUQM\"",
		"mtime": "2026-07-22T01:18:43.039Z",
		"size": 484,
		"path": "../public/assets/assistant-2l4XiOb9.js"
	},
	"/assets/achats-Co0s2WKp.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1146-OT8yk1hXtX9uazQnIXRsO+mu5dg\"",
		"mtime": "2026-07-22T01:18:43.039Z",
		"size": 4422,
		"path": "../public/assets/achats-Co0s2WKp.js"
	},
	"/assets/AppShell-DMePSwnd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e8d1-rvrf/cq5jahsBXrz0IMJxS/PlN0\"",
		"mtime": "2026-07-22T01:18:43.039Z",
		"size": 59601,
		"path": "../public/assets/AppShell-DMePSwnd.js"
	},
	"/assets/chart-column-B4iWJBA4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fb-G3L+yqy34GjcHs4owxKk4Kg1cYA\"",
		"mtime": "2026-07-22T01:18:43.039Z",
		"size": 251,
		"path": "../public/assets/chart-column-B4iWJBA4.js"
	},
	"/assets/button-sy5HhDqa.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10d8-cWoWGvwONFX89hKvVLCPwJC/2ro\"",
		"mtime": "2026-07-22T01:18:43.039Z",
		"size": 4312,
		"path": "../public/assets/button-sy5HhDqa.js"
	},
	"/assets/depenses-BbowX6dJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5d4-7s2yKksRy1NSTyK4S/JHftF7wFo\"",
		"mtime": "2026-07-22T01:18:43.052Z",
		"size": 1492,
		"path": "../public/assets/depenses-BbowX6dJ.js"
	},
	"/assets/clients-B1T56OYT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3d7-f7ra4oDAWxe2oVslkZESvEmr9KI\"",
		"mtime": "2026-07-22T01:18:43.052Z",
		"size": 983,
		"path": "../public/assets/clients-B1T56OYT.js"
	},
	"/assets/createLucideIcon-CFVCT5Vk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4cc-L7TfdsRWsuZ3FDbxHESbf3t7R9s\"",
		"mtime": "2026-07-22T01:18:43.052Z",
		"size": 1228,
		"path": "../public/assets/createLucideIcon-CFVCT5Vk.js"
	},
	"/assets/dist-CuQSbciU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1f5-Yky8IQb8MghkNGOO7Q29OTgl0q0\"",
		"mtime": "2026-07-22T01:18:43.052Z",
		"size": 501,
		"path": "../public/assets/dist-CuQSbciU.js"
	},
	"/assets/format-39Lu8dHk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b6-9PlMkflK3oqFwVO7TJUoKaFFwjE\"",
		"mtime": "2026-07-22T01:18:43.052Z",
		"size": 694,
		"path": "../public/assets/format-39Lu8dHk.js"
	},
	"/assets/fournisseurs-dMaIAtcu.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3f0-Zub3TusF+hBMpafmjsj512RZv10\"",
		"mtime": "2026-07-22T01:18:43.052Z",
		"size": 1008,
		"path": "../public/assets/fournisseurs-dMaIAtcu.js"
	},
	"/assets/image-qLt0LyVZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10d-rpILWXxyNGJFCJyr+Xscq7X7OZ0\"",
		"mtime": "2026-07-22T01:18:43.052Z",
		"size": 269,
		"path": "../public/assets/image-qLt0LyVZ.js"
	},
	"/assets/index.es-DCvMcLJC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f45-GJz/6EQZwn/GVLHcSaepD1ZxmdE\"",
		"mtime": "2026-07-22T01:18:43.052Z",
		"size": 151365,
		"path": "../public/assets/index.es-DCvMcLJC.js"
	},
	"/assets/journal-CkQQgJtF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"574-8hgGb6gBmzB3YjDe6vNWykUr/hQ\"",
		"mtime": "2026-07-22T01:18:43.052Z",
		"size": 1396,
		"path": "../public/assets/journal-CkQQgJtF.js"
	},
	"/assets/jsx-runtime-DiK4U9sA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b3-wXxXyswNhndByM42wnD5/FJtWq0\"",
		"mtime": "2026-07-22T01:18:43.052Z",
		"size": 435,
		"path": "../public/assets/jsx-runtime-DiK4U9sA.js"
	},
	"/assets/LineItemsDialog--6gFoBMr.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2763-qNEhvzIPwHfuenxtLGoVdvvXEh0\"",
		"mtime": "2026-07-22T01:18:43.039Z",
		"size": 10083,
		"path": "../public/assets/LineItemsDialog--6gFoBMr.js"
	},
	"/assets/label-DijoNM8a.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"59a-M/9wAB84dQrfYMYVwGlV4EDLhQE\"",
		"mtime": "2026-07-22T01:18:43.060Z",
		"size": 1434,
		"path": "../public/assets/label-DijoNM8a.js"
	},
	"/assets/link-DBB8N1rs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5b45-opl+SbxQJI7q0kyrMI4U2MIPtGE\"",
		"mtime": "2026-07-22T01:18:43.062Z",
		"size": 23365,
		"path": "../public/assets/link-DBB8N1rs.js"
	},
	"/assets/loader-circle-753CjeZG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"90-y3L9xGw0dIsm2b7LdJ5F6H3nxSI\"",
		"mtime": "2026-07-22T01:18:43.062Z",
		"size": 144,
		"path": "../public/assets/loader-circle-753CjeZG.js"
	},
	"/assets/devis-EumFhrEP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6d546-7AotyuD1aCJRzpd8jnJzryWKLeg\"",
		"mtime": "2026-07-22T01:18:43.052Z",
		"size": 447814,
		"path": "../public/assets/devis-EumFhrEP.js"
	},
	"/assets/index-Csqq9v4I.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"5783f-1tde1QemmJzKds6G5UYTZoQQTTA\"",
		"mtime": "2026-07-22T01:18:43.039Z",
		"size": 358463,
		"path": "../public/assets/index-Csqq9v4I.js"
	},
	"/assets/html2canvas-CshxQvNN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30b8d-nt1FVLhcCKhaGHjxZjLX/QCcQ60\"",
		"mtime": "2026-07-22T01:18:43.052Z",
		"size": 199565,
		"path": "../public/assets/html2canvas-CshxQvNN.js"
	},
	"/assets/login-KshejEEL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99ef-B66PnBXcD8XnhbFQeatqjm2GusM\"",
		"mtime": "2026-07-22T01:18:43.062Z",
		"size": 39407,
		"path": "../public/assets/login-KshejEEL.js"
	},
	"/assets/minus-5yun384u.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10f-ETXuS/lpCZgaJEUQgaW63O7S9o4\"",
		"mtime": "2026-07-22T01:18:43.069Z",
		"size": 271,
		"path": "../public/assets/minus-5yun384u.js"
	},
	"/assets/parametres-f1URewer.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"aa4f-rHhJq9nyDpXk7wHUQMpCQRc9XNw\"",
		"mtime": "2026-07-22T01:18:43.069Z",
		"size": 43599,
		"path": "../public/assets/parametres-f1URewer.js"
	},
	"/assets/pencil-Rfn2K6vx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a20-Kuwfkgor/sZZ7MuzDA959w+eAdU\"",
		"mtime": "2026-07-22T01:18:43.069Z",
		"size": 2592,
		"path": "../public/assets/pencil-Rfn2K6vx.js"
	},
	"/assets/plus-BcKKCMkT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-bX7DWVNvhm25WmTHovWSDAOhkzA\"",
		"mtime": "2026-07-22T01:18:43.069Z",
		"size": 153,
		"path": "../public/assets/plus-BcKKCMkT.js"
	},
	"/assets/PieChart-DJnTa53u.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"63194-ss7MrEgkdqaDj/3mWfSHdEMsJ6w\"",
		"mtime": "2026-07-22T01:18:43.039Z",
		"size": 405908,
		"path": "../public/assets/PieChart-DJnTa53u.js"
	},
	"/assets/proxy-BwZcppw7.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1daab-Gdkksbh5G5ZPpq2HmPiByb+B/0M\"",
		"mtime": "2026-07-22T01:18:43.069Z",
		"size": 121515,
		"path": "../public/assets/proxy-BwZcppw7.js"
	},
	"/assets/purify.es-DuRL7t6i.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68ff-UzqdquwlS23jMr/0lDNWmxy5AL0\"",
		"mtime": "2026-07-22T01:18:43.069Z",
		"size": 26879,
		"path": "../public/assets/purify.es-DuRL7t6i.js"
	},
	"/assets/rapports-yMgrkJus.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d59-KDXZuch8/wqSyFO+WOraNeRt2d4\"",
		"mtime": "2026-07-22T01:18:43.069Z",
		"size": 7513,
		"path": "../public/assets/rapports-yMgrkJus.js"
	},
	"/assets/react-9ZasmZpi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d6c-TUNbcXoAcWz2cdRXtghoqoMFdow\"",
		"mtime": "2026-07-22T01:18:43.069Z",
		"size": 7532,
		"path": "../public/assets/react-9ZasmZpi.js"
	},
	"/assets/ResourceTable-CnXeUoFU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1af6-zAdv0737onP5SnOdtHFd/GHidxo\"",
		"mtime": "2026-07-22T01:18:43.039Z",
		"size": 6902,
		"path": "../public/assets/ResourceTable-CnXeUoFU.js"
	},
	"/assets/rolldown-runtime-CNC7AqOf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"36f-poL7VEo+W3rlEpE8cNtjWDVI11g\"",
		"mtime": "2026-07-22T01:18:43.069Z",
		"size": 879,
		"path": "../public/assets/rolldown-runtime-CNC7AqOf.js"
	},
	"/assets/route-permissions--lwXeRQY.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3e2-ZQ9tWXuI/1by8hRekkbouw596GE\"",
		"mtime": "2026-07-22T01:18:43.069Z",
		"size": 994,
		"path": "../public/assets/route-permissions--lwXeRQY.js"
	},
	"/assets/routes-Ch-htSDL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1046a-HuodZqF4eFRZhWcj7gESNE32nGw\"",
		"mtime": "2026-07-22T01:18:43.069Z",
		"size": 66666,
		"path": "../public/assets/routes-Ch-htSDL.js"
	},
	"/assets/select-DvW5HlRJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"57a3-wG4rpnhUjt02KEDmgx4uCNlM8D4\"",
		"mtime": "2026-07-22T01:18:43.069Z",
		"size": 22435,
		"path": "../public/assets/select-DvW5HlRJ.js"
	},
	"/assets/services-BV2EUbph.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"502-0uRCY4HWRHWMgSv0lsqaoKYHFTE\"",
		"mtime": "2026-07-22T01:18:43.069Z",
		"size": 1282,
		"path": "../public/assets/services-BV2EUbph.js"
	},
	"/assets/sheet-Dd_arLm0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9768-rQdTuCS71GY62gdpqPgFahOygH0\"",
		"mtime": "2026-07-22T01:18:43.077Z",
		"size": 38760,
		"path": "../public/assets/sheet-Dd_arLm0.js"
	},
	"/assets/table-CZhEUaUl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6b4-mOQQBFA19SkmVhy0wx3NV9MZCNg\"",
		"mtime": "2026-07-22T01:18:43.077Z",
		"size": 1716,
		"path": "../public/assets/table-CZhEUaUl.js"
	},
	"/assets/styles-DViLFA6h.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"1964a-Hq8PNzcVjFG6V4SatuUfcJd/VKI\"",
		"mtime": "2026-07-22T01:18:43.085Z",
		"size": 104010,
		"path": "../public/assets/styles-DViLFA6h.css"
	},
	"/assets/tabs-RYl9Mz4z.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f2f-f9eKJKUNZr9McBl3eVg6SOqQZ34\"",
		"mtime": "2026-07-22T01:18:43.077Z",
		"size": 3887,
		"path": "../public/assets/tabs-RYl9Mz4z.js"
	},
	"/assets/trash-2-D0B5Nh2_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"148-0IKH9R2cWNF8xpksW49oPrbpCIQ\"",
		"mtime": "2026-07-22T01:18:43.077Z",
		"size": 328,
		"path": "../public/assets/trash-2-D0B5Nh2_.js"
	},
	"/assets/use-company-settings-BRehbxVK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8247-Qp7Fr8RqJR4zbWcDawCdBYXy3L4\"",
		"mtime": "2026-07-22T01:18:43.077Z",
		"size": 33351,
		"path": "../public/assets/use-company-settings-BRehbxVK.js"
	},
	"/assets/typeof-B5XbjTb1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10f-yPXEOGyFHb1Ws7OoWyWNEEBz4mQ\"",
		"mtime": "2026-07-22T01:18:43.077Z",
		"size": 271,
		"path": "../public/assets/typeof-B5XbjTb1.js"
	},
	"/assets/useNavigate-CRSf_--S.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"105-tTDhsfwD4tQ+c+QYfoS7qv200UM\"",
		"mtime": "2026-07-22T01:18:43.077Z",
		"size": 261,
		"path": "../public/assets/useNavigate-CRSf_--S.js"
	},
	"/assets/useQuery-BIBURSgR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"384b7-XE+3b+YWxoTZzPYyrlbrNWCrvcw\"",
		"mtime": "2026-07-22T01:18:43.077Z",
		"size": 230583,
		"path": "../public/assets/useQuery-BIBURSgR.js"
	},
	"/assets/useRouter-CdsLsn5t.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e58-7MUOq7YFlgFZLjCDehpdfE9fQOw\"",
		"mtime": "2026-07-22T01:18:43.077Z",
		"size": 3672,
		"path": "../public/assets/useRouter-CdsLsn5t.js"
	},
	"/assets/utilisateurs-DswWGXQv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"749-GX6S2reobMNWT2DyXyrdFpFEDrg\"",
		"mtime": "2026-07-22T01:18:43.077Z",
		"size": 1865,
		"path": "../public/assets/utilisateurs-DswWGXQv.js"
	},
	"/assets/utils-B6KiDbIe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6a7d-iNkBSvaSyIjvZOzWoTvEa49qwcI\"",
		"mtime": "2026-07-22T01:18:43.077Z",
		"size": 27261,
		"path": "../public/assets/utils-B6KiDbIe.js"
	},
	"/assets/ventes-BTgOrwBH.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"555a-N430d8ksX4B6CyKTCn2TiUqCjRI\"",
		"mtime": "2026-07-22T01:18:43.077Z",
		"size": 21850,
		"path": "../public/assets/ventes-BTgOrwBH.js"
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

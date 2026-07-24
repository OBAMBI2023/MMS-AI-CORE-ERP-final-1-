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
	"/assets/403-ftpRiMIR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"59a-R+NfIv07vZfKL3NrMfMr475cIIc\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 1434,
		"path": "../public/assets/403-ftpRiMIR.js"
	},
	"/assets/achats-HIJJhjaK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"19cb-tzsKSFm/LyeVs8Qp0m1rQq4nebE\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 6603,
		"path": "../public/assets/achats-HIJJhjaK.js"
	},
	"/assets/AnimatePresence-Dq1NVp2m.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1122-BepjFeItTJzeMkvRzz9RCKGpQE8\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 4386,
		"path": "../public/assets/AnimatePresence-Dq1NVp2m.js"
	},
	"/assets/AppShell-l0gC0-on.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1de9-m/jbPmS9k0FW3Y+5C+vX0QKf/EA\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 7657,
		"path": "../public/assets/AppShell-l0gC0-on.js"
	},
	"/assets/badge-Bm8odxZP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"452-lcpEWxhcKfNyHhlq27/UO0BBot0\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 1106,
		"path": "../public/assets/badge-Bm8odxZP.js"
	},
	"/assets/audit.server-C5QyHovg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f4c-t4qL6c89mMrn6O/z3JchHJyZGpc\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 3916,
		"path": "../public/assets/audit.server-C5QyHovg.js"
	},
	"/assets/button-BlHjp35U.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12a0-BpX+X3Jp0/7rplHVvYxo4DgIG+w\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 4768,
		"path": "../public/assets/button-BlHjp35U.js"
	},
	"/assets/clients-i-O3Qm6m.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"409-g8TMzbJCucq5cbNYJ0XazvuKFzE\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 1033,
		"path": "../public/assets/clients-i-O3Qm6m.js"
	},
	"/assets/chart-column-CbModfWa.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fb-bZz2m2TKq5HalmT/uv9nbvJG+W0\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 251,
		"path": "../public/assets/chart-column-CbModfWa.js"
	},
	"/assets/createLucideIcon-C3-9FVOn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4d7-Z9cNu+/L/cffV/h72vXwAPv3mwE\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 1239,
		"path": "../public/assets/createLucideIcon-C3-9FVOn.js"
	},
	"/assets/depenses-D06Co1ir.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a4d-1CCZyNPj/sYGNFqaEaJU1l3glpU\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 2637,
		"path": "../public/assets/depenses-D06Co1ir.js"
	},
	"/assets/dialog-BiPr3PN9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"866-WNhYULYAkZ//SWm+iwQr8qwR7uQ\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 2150,
		"path": "../public/assets/dialog-BiPr3PN9.js"
	},
	"/assets/dist-BR2mqaK0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1da-gSsgfQKBYBQTgc78MjHjEcfcTq8\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 474,
		"path": "../public/assets/dist-BR2mqaK0.js"
	},
	"/assets/devis-CZ4H2mT6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"410a-rykDb0/+KloHttk7ia3THdTU1QA\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 16650,
		"path": "../public/assets/devis-CZ4H2mT6.js"
	},
	"/assets/dist-CETYiUmh.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"779c-tidOacfc1ZoxW5E73e47eKRUDg8\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 30620,
		"path": "../public/assets/dist-CETYiUmh.js"
	},
	"/assets/download-_mveqGQ6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e8-pWRc6XwWenGmSvTrhdtk9n3J1eY\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 232,
		"path": "../public/assets/download-_mveqGQ6.js"
	},
	"/assets/dropdown-menu-Do-CbzFK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d06e-2BmZWNxXPk8x+sUW8sTLtnFcwrw\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 53358,
		"path": "../public/assets/dropdown-menu-Do-CbzFK.js"
	},
	"/assets/fournisseurs-pgXz3VmJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"42c-CfkZW0fkkZJGOLVycy8cC40k8Q8\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 1068,
		"path": "../public/assets/fournisseurs-pgXz3VmJ.js"
	},
	"/assets/format-A9gweh3W.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30a-XYImF1jBbYk3sA5kFwezMeOu+Ik\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 778,
		"path": "../public/assets/format-A9gweh3W.js"
	},
	"/assets/journal-DY2_NEQE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"571-nCirnL0Y+bwdMKlyybsGS4L91jg\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 1393,
		"path": "../public/assets/journal-DY2_NEQE.js"
	},
	"/assets/html2canvas-CshxQvNN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30b8d-nt1FVLhcCKhaGHjxZjLX/QCcQ60\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 199565,
		"path": "../public/assets/html2canvas-CshxQvNN.js"
	},
	"/assets/input-Dp3rgEH1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b7-JyUVZo+UM1FeSN6FFO5aWXYs46g\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 695,
		"path": "../public/assets/input-Dp3rgEH1.js"
	},
	"/assets/index.es-1NmilT1w.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f46-EKet9qhD6DbP27WAO+yrU7sXSQk\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 151366,
		"path": "../public/assets/index.es-1NmilT1w.js"
	},
	"/assets/index-BqnFHXlt.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a5559-sMKd61bVwy6ffrEqOFIUKDicvGk\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 677209,
		"path": "../public/assets/index-BqnFHXlt.js"
	},
	"/assets/jsx-runtime-CaR_m4Xc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1edb-YA3tihQJPH2usBIGDc+C49NkLY4\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 7899,
		"path": "../public/assets/jsx-runtime-CaR_m4Xc.js"
	},
	"/assets/label-DXz-21PN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"507-8C22wVFXCcpJvVPSP14i+p9IM4Y\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 1287,
		"path": "../public/assets/label-DXz-21PN.js"
	},
	"/assets/LineItemsDialog-zf6K5F81.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24ff-jnvfdPykmFw6ZNRXBuI6nuJRkFI\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 9471,
		"path": "../public/assets/LineItemsDialog-zf6K5F81.js"
	},
	"/assets/loader-circle-CGlvUOEy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"90-K6U2Wg8z39QdxXC3DEUqJ3nZtEk\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 144,
		"path": "../public/assets/loader-circle-CGlvUOEy.js"
	},
	"/assets/login-YTVuJqOb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"977b-FazEAPgzK6L1Jk2cK/UC+ozyTSY\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 38779,
		"path": "../public/assets/login-YTVuJqOb.js"
	},
	"/assets/mail-ByzsXNCg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d5-0kA/b/o07PWeOvdOyIvB4ZYjyUw\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 213,
		"path": "../public/assets/mail-ByzsXNCg.js"
	},
	"/assets/jspdf.es.min-BJhaVkx5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"618a1-55e+Vw1k1WjiVaDCGl5e+8T2BxM\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 399521,
		"path": "../public/assets/jspdf.es.min-BJhaVkx5.js"
	},
	"/assets/minus-y9jRf8-V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10f-lFSU5fPdVqGiNZJlYY+H6+UOT7c\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 271,
		"path": "../public/assets/minus-y9jRf8-V.js"
	},
	"/assets/pdf-template-engine-Cx-ilyqo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cd0-hGYC6DxMKpLiMv7abFH1szNAUwQ\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 3280,
		"path": "../public/assets/pdf-template-engine-Cx-ilyqo.js"
	},
	"/assets/parametres-DhabRTUZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"618a-enlCfiFWYRxlNQfzP75NxTTukaA\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 24970,
		"path": "../public/assets/parametres-DhabRTUZ.js"
	},
	"/assets/plus-xZP-4Ne5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-w82yHeRYyIbDDYgCld5HDFWUROI\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 153,
		"path": "../public/assets/plus-xZP-4Ne5.js"
	},
	"/assets/rapports-D1KiASjf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"265f-sBpIcKHvYX47eUZYqsA3f2SqJgE\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 9823,
		"path": "../public/assets/rapports-D1KiASjf.js"
	},
	"/assets/purify.es-DuRL7t6i.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68ff-UzqdquwlS23jMr/0lDNWmxy5AL0\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 26879,
		"path": "../public/assets/purify.es-DuRL7t6i.js"
	},
	"/assets/react-dom-uEpu2rGo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e06-iAd91dqrbuWQTWAeFkOuqKPkQ40\"",
		"mtime": "2026-07-24T10:11:30.130Z",
		"size": 3590,
		"path": "../public/assets/react-dom-uEpu2rGo.js"
	},
	"/assets/proxy-D2s3CPhQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d862-5s6QQjg//3yZga6bRkyaWQTsB5I\"",
		"mtime": "2026-07-24T10:11:30.114Z",
		"size": 120930,
		"path": "../public/assets/proxy-D2s3CPhQ.js"
	},
	"/assets/rolldown-runtime-CNC7AqOf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"36f-poL7VEo+W3rlEpE8cNtjWDVI11g\"",
		"mtime": "2026-07-24T10:11:30.130Z",
		"size": 879,
		"path": "../public/assets/rolldown-runtime-CNC7AqOf.js"
	},
	"/assets/ResourceTable-BasCbiqn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c54-hbvXNOZR7X3fGR4dED0DKfO3NDY\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 7252,
		"path": "../public/assets/ResourceTable-BasCbiqn.js"
	},
	"/assets/services-DntVXWHe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"53b-rVsJosyezC2gZy9/SZO8Na5xhM8\"",
		"mtime": "2026-07-24T10:11:30.130Z",
		"size": 1339,
		"path": "../public/assets/services-DntVXWHe.js"
	},
	"/assets/select-CDX5RN1S.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"56b4-9zIYIoF1wLjix74msti1NQoghfc\"",
		"mtime": "2026-07-24T10:11:30.130Z",
		"size": 22196,
		"path": "../public/assets/select-CDX5RN1S.js"
	},
	"/assets/routes-BX55sVRO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1041f-I/QoZyX/nSiyxoqAg439jqjtpWU\"",
		"mtime": "2026-07-24T10:11:30.130Z",
		"size": 66591,
		"path": "../public/assets/routes-BX55sVRO.js"
	},
	"/assets/sheet-CVQFodAR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"203e-9RpvPG+7WemwyTTtX2r/7FxRFdE\"",
		"mtime": "2026-07-24T10:11:30.130Z",
		"size": 8254,
		"path": "../public/assets/sheet-CVQFodAR.js"
	},
	"/assets/table-Dkywo88T.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"698-HjzQCgJ71EU+Dr9sSVLiHxi5C6g\"",
		"mtime": "2026-07-24T10:11:30.130Z",
		"size": 1688,
		"path": "../public/assets/table-Dkywo88T.js"
	},
	"/assets/styles-DXELqSKH.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"196fe-w0VaYjDN88rP5fQqrSg40d/qgh8\"",
		"mtime": "2026-07-24T10:11:30.137Z",
		"size": 104190,
		"path": "../public/assets/styles-DXELqSKH.css"
	},
	"/assets/PieChart-Bh6MiNAO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6319a-Y9PJc7Fxo0QDC26PyLrIaoe0MpA\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 405914,
		"path": "../public/assets/PieChart-Bh6MiNAO.js"
	},
	"/assets/tabs-CNEYgb1o.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f18-FnJSE9r8dB04TPWUEmmorDTOoNU\"",
		"mtime": "2026-07-24T10:11:30.130Z",
		"size": 3864,
		"path": "../public/assets/tabs-CNEYgb1o.js"
	},
	"/assets/UserManagementTable-83twMAKw.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4b22-VDdPl1gCbdCwmpaxO1bItgSZvms\"",
		"mtime": "2026-07-24T10:11:30.098Z",
		"size": 19234,
		"path": "../public/assets/UserManagementTable-83twMAKw.js"
	},
	"/assets/use-action-permission-Cn5ZnF8P.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a0-WfZ1FPhP9kDx5MiV2gEePoo2d9o\"",
		"mtime": "2026-07-24T10:11:30.130Z",
		"size": 160,
		"path": "../public/assets/use-action-permission-Cn5ZnF8P.js"
	},
	"/assets/utils-B6KiDbIe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6a7d-iNkBSvaSyIjvZOzWoTvEa49qwcI\"",
		"mtime": "2026-07-24T10:11:30.130Z",
		"size": 27261,
		"path": "../public/assets/utils-B6KiDbIe.js"
	},
	"/assets/utilisateurs-rZlYkiDe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cf-I4630uAK8N8TS/hStVlOJnc77aI\"",
		"mtime": "2026-07-24T10:11:30.130Z",
		"size": 207,
		"path": "../public/assets/utilisateurs-rZlYkiDe.js"
	},
	"/assets/ventes-BVzdyZiJ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"757d-VXNPM56LNQz+tGbwnuKHW5SiNlg\"",
		"mtime": "2026-07-24T10:11:30.130Z",
		"size": 30077,
		"path": "../public/assets/ventes-BVzdyZiJ.js"
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

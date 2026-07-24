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
	"/assets/achats-gHekPLUX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"19a4-dc5lFlU4QMgHPlv2Y/3J8e1fBDM\"",
		"mtime": "2026-07-23T23:36:59.967Z",
		"size": 6564,
		"path": "../public/assets/achats-gHekPLUX.js"
	},
	"/assets/403-BgTEzIVD.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"59a-eSBCKCrBuI0Vmhc5hHB/mqa6QzU\"",
		"mtime": "2026-07-23T23:36:59.957Z",
		"size": 1434,
		"path": "../public/assets/403-BgTEzIVD.js"
	},
	"/assets/AppShell-HuLRNX3K.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d2b-S6CzD2CQQRDMWJp9ZvDyHaTHIkE\"",
		"mtime": "2026-07-23T23:36:59.967Z",
		"size": 7467,
		"path": "../public/assets/AppShell-HuLRNX3K.js"
	},
	"/assets/AnimatePresence-Dq1NVp2m.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1122-BepjFeItTJzeMkvRzz9RCKGpQE8\"",
		"mtime": "2026-07-23T23:36:59.967Z",
		"size": 4386,
		"path": "../public/assets/AnimatePresence-Dq1NVp2m.js"
	},
	"/assets/badge-Bm8odxZP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"452-lcpEWxhcKfNyHhlq27/UO0BBot0\"",
		"mtime": "2026-07-23T23:36:59.967Z",
		"size": 1106,
		"path": "../public/assets/badge-Bm8odxZP.js"
	},
	"/assets/button-BlHjp35U.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12a0-BpX+X3Jp0/7rplHVvYxo4DgIG+w\"",
		"mtime": "2026-07-23T23:36:59.967Z",
		"size": 4768,
		"path": "../public/assets/button-BlHjp35U.js"
	},
	"/assets/audit.server-CGvJ_mNF.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fe9-z0nfTm+DpXoVZL9p1zOqZdnkQyE\"",
		"mtime": "2026-07-23T23:36:59.967Z",
		"size": 4073,
		"path": "../public/assets/audit.server-CGvJ_mNF.js"
	},
	"/assets/clients-DUvC0lXX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"409-bl+H4h73lKYGBvMTYJo/vBp4WjU\"",
		"mtime": "2026-07-23T23:36:59.973Z",
		"size": 1033,
		"path": "../public/assets/clients-DUvC0lXX.js"
	},
	"/assets/createLucideIcon-C3-9FVOn.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4d7-Z9cNu+/L/cffV/h72vXwAPv3mwE\"",
		"mtime": "2026-07-23T23:36:59.973Z",
		"size": 1239,
		"path": "../public/assets/createLucideIcon-C3-9FVOn.js"
	},
	"/assets/depenses-BPUhh7DK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a3f-kdJeQo4RCHZaf1i1mnfTFnYCjXQ\"",
		"mtime": "2026-07-23T23:36:59.973Z",
		"size": 2623,
		"path": "../public/assets/depenses-BPUhh7DK.js"
	},
	"/assets/chart-column-CbModfWa.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fb-bZz2m2TKq5HalmT/uv9nbvJG+W0\"",
		"mtime": "2026-07-23T23:36:59.967Z",
		"size": 251,
		"path": "../public/assets/chart-column-CbModfWa.js"
	},
	"/assets/dialog-o76JkOfe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"866-Huaq5dP/gvxOXReVcggFnnKEw9g\"",
		"mtime": "2026-07-23T23:36:59.974Z",
		"size": 2150,
		"path": "../public/assets/dialog-o76JkOfe.js"
	},
	"/assets/dist-BR2mqaK0.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1da-gSsgfQKBYBQTgc78MjHjEcfcTq8\"",
		"mtime": "2026-07-23T23:36:59.975Z",
		"size": 474,
		"path": "../public/assets/dist-BR2mqaK0.js"
	},
	"/assets/devis-DqFYdUaX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"40d9-KpX9V1U3EFRFwWVyHtXiweyauTE\"",
		"mtime": "2026-07-23T23:36:59.974Z",
		"size": 16601,
		"path": "../public/assets/devis-DqFYdUaX.js"
	},
	"/assets/dist-BS0mUSTP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"77f9-bkxEBxkTFYZK1nS2M9XqrwMCxq4\"",
		"mtime": "2026-07-23T23:36:59.975Z",
		"size": 30713,
		"path": "../public/assets/dist-BS0mUSTP.js"
	},
	"/assets/format-A9gweh3W.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30a-XYImF1jBbYk3sA5kFwezMeOu+Ik\"",
		"mtime": "2026-07-23T23:36:59.976Z",
		"size": 778,
		"path": "../public/assets/format-A9gweh3W.js"
	},
	"/assets/download-_mveqGQ6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e8-pWRc6XwWenGmSvTrhdtk9n3J1eY\"",
		"mtime": "2026-07-23T23:36:59.976Z",
		"size": 232,
		"path": "../public/assets/download-_mveqGQ6.js"
	},
	"/assets/dropdown-menu-CcnhhYSk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d076-5dT63qdMvRQ6rgfDrAIcZE3FrhY\"",
		"mtime": "2026-07-23T23:36:59.976Z",
		"size": 53366,
		"path": "../public/assets/dropdown-menu-CcnhhYSk.js"
	},
	"/assets/fournisseurs-TmEMdJNv.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"42c-iTjNTFyjsYbSV4nrh4h+8QVRQ1s\"",
		"mtime": "2026-07-23T23:36:59.977Z",
		"size": 1068,
		"path": "../public/assets/fournisseurs-TmEMdJNv.js"
	},
	"/assets/input-BX4YdnKR.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2b1-Sy0VcB5iRZ14c/Bx7tkFRB9GfaQ\"",
		"mtime": "2026-07-23T23:36:59.978Z",
		"size": 689,
		"path": "../public/assets/input-BX4YdnKR.js"
	},
	"/assets/journal-BAewaL8I.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"571-zwPvIQxbPoRyNTJABbBFH5Od07o\"",
		"mtime": "2026-07-23T23:36:59.979Z",
		"size": 1393,
		"path": "../public/assets/journal-BAewaL8I.js"
	},
	"/assets/html2canvas-CshxQvNN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30b8d-nt1FVLhcCKhaGHjxZjLX/QCcQ60\"",
		"mtime": "2026-07-23T23:36:59.977Z",
		"size": 199565,
		"path": "../public/assets/html2canvas-CshxQvNN.js"
	},
	"/assets/index.es-CiM6trpO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f46-2QEBAIlOWt8bjjYiutdr3vVG4cA\"",
		"mtime": "2026-07-23T23:36:59.978Z",
		"size": 151366,
		"path": "../public/assets/index.es-CiM6trpO.js"
	},
	"/assets/index-D4zNXPNs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"a4fef-RhOKgfzv6zSLST2CkCnF7JrCFFM\"",
		"mtime": "2026-07-23T23:36:59.957Z",
		"size": 675823,
		"path": "../public/assets/index-D4zNXPNs.js"
	},
	"/assets/jsx-runtime-CaR_m4Xc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1edb-YA3tihQJPH2usBIGDc+C49NkLY4\"",
		"mtime": "2026-07-23T23:36:59.979Z",
		"size": 7899,
		"path": "../public/assets/jsx-runtime-CaR_m4Xc.js"
	},
	"/assets/label-DXz-21PN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"507-8C22wVFXCcpJvVPSP14i+p9IM4Y\"",
		"mtime": "2026-07-23T23:36:59.979Z",
		"size": 1287,
		"path": "../public/assets/label-DXz-21PN.js"
	},
	"/assets/LineItemsDialog-EDa0tGYB.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"247f-unsCMnVe4BE4SUH1MKfC26Mie84\"",
		"mtime": "2026-07-23T23:36:59.967Z",
		"size": 9343,
		"path": "../public/assets/LineItemsDialog-EDa0tGYB.js"
	},
	"/assets/loader-circle-CGlvUOEy.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"90-K6U2Wg8z39QdxXC3DEUqJ3nZtEk\"",
		"mtime": "2026-07-23T23:36:59.979Z",
		"size": 144,
		"path": "../public/assets/loader-circle-CGlvUOEy.js"
	},
	"/assets/mail-ByzsXNCg.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d5-0kA/b/o07PWeOvdOyIvB4ZYjyUw\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 213,
		"path": "../public/assets/mail-ByzsXNCg.js"
	},
	"/assets/minus-y9jRf8-V.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10f-lFSU5fPdVqGiNZJlYY+H6+UOT7c\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 271,
		"path": "../public/assets/minus-y9jRf8-V.js"
	},
	"/assets/login-D6BJoTj9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9771-6lOYCBgy0NCvgaXZ+m68EtGIrvU\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 38769,
		"path": "../public/assets/login-D6BJoTj9.js"
	},
	"/assets/pdf-template-engine-Y1C3-bZ3.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cd0-PROWJAl/uyrWh2f3QTyw92BIW34\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 3280,
		"path": "../public/assets/pdf-template-engine-Y1C3-bZ3.js"
	},
	"/assets/parametres-B5xpLe3h.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7cbb-7a6gWrE+6C15IH+XZw1FaIIsKjE\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 31931,
		"path": "../public/assets/parametres-B5xpLe3h.js"
	},
	"/assets/plus-xZP-4Ne5.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-w82yHeRYyIbDDYgCld5HDFWUROI\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 153,
		"path": "../public/assets/plus-xZP-4Ne5.js"
	},
	"/assets/proxy-D2s3CPhQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d862-5s6QQjg//3yZga6bRkyaWQTsB5I\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 120930,
		"path": "../public/assets/proxy-D2s3CPhQ.js"
	},
	"/assets/purify.es-DuRL7t6i.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68ff-UzqdquwlS23jMr/0lDNWmxy5AL0\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 26879,
		"path": "../public/assets/purify.es-DuRL7t6i.js"
	},
	"/assets/rapports-51l-SSjT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2698-LC7U4EQtbb4VnzIE4RY/FBkAGYk\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 9880,
		"path": "../public/assets/rapports-51l-SSjT.js"
	},
	"/assets/react-dom-uEpu2rGo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e06-iAd91dqrbuWQTWAeFkOuqKPkQ40\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 3590,
		"path": "../public/assets/react-dom-uEpu2rGo.js"
	},
	"/assets/ResourceTable-DoIROVsP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1c19-ofOGCA/2YTfwHVgmFyAY1QQavG0\"",
		"mtime": "2026-07-23T23:36:59.967Z",
		"size": 7193,
		"path": "../public/assets/ResourceTable-DoIROVsP.js"
	},
	"/assets/rolldown-runtime-CNC7AqOf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"36f-poL7VEo+W3rlEpE8cNtjWDVI11g\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 879,
		"path": "../public/assets/rolldown-runtime-CNC7AqOf.js"
	},
	"/assets/routes-CMYRhsxA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1041f-vIm+z1Z0ChX/ym5Oo2rNgIbSDzw\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 66591,
		"path": "../public/assets/routes-CMYRhsxA.js"
	},
	"/assets/select-DVBxOWcC.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"56bb-7WrF3aIgb1mEX0ZBjyRUKLVT+O0\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 22203,
		"path": "../public/assets/select-DVBxOWcC.js"
	},
	"/assets/sheet-BlmttgV1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"202f-gVXnemOrEF9gXxAofCHKSYUaPss\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 8239,
		"path": "../public/assets/sheet-BlmttgV1.js"
	},
	"/assets/services-DTMiswuX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"53b-t7daNUx4y8jQWJrvF1qCuO0DIdo\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 1339,
		"path": "../public/assets/services-DTMiswuX.js"
	},
	"/assets/styles-C-FkuI8b.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"19471-btrk1vqWjwx5ZnU2CoGd1S1zuSk\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 103537,
		"path": "../public/assets/styles-C-FkuI8b.css"
	},
	"/assets/table-Dkywo88T.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"698-HjzQCgJ71EU+Dr9sSVLiHxi5C6g\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 1688,
		"path": "../public/assets/table-Dkywo88T.js"
	},
	"/assets/jspdf.es.min-DYILvIex.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"618a1-8JpSgKSuZ1IlZxr8GRuchFBKAlA\"",
		"mtime": "2026-07-23T23:36:59.979Z",
		"size": 399521,
		"path": "../public/assets/jspdf.es.min-DYILvIex.js"
	},
	"/assets/PieChart-Bh6MiNAO.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6319a-Y9PJc7Fxo0QDC26PyLrIaoe0MpA\"",
		"mtime": "2026-07-23T23:36:59.967Z",
		"size": 405914,
		"path": "../public/assets/PieChart-Bh6MiNAO.js"
	},
	"/assets/tabs-D6B1dhDd.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f18-ItI3j5M8Xd8hMtf2bYx7hDAlIEM\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 3864,
		"path": "../public/assets/tabs-D6B1dhDd.js"
	},
	"/assets/utilisateurs-CASEHAgL.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cf-4VYUxwqsc1hpfnWVEmLlcnXUJ5c\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 207,
		"path": "../public/assets/utilisateurs-CASEHAgL.js"
	},
	"/assets/UserManagementTable-B69ooCtq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4aed-IOJ1EtuHJV8N/yBSgPIUCd4sy3M\"",
		"mtime": "2026-07-23T23:36:59.967Z",
		"size": 19181,
		"path": "../public/assets/UserManagementTable-B69ooCtq.js"
	},
	"/assets/utils-B6KiDbIe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6a7d-iNkBSvaSyIjvZOzWoTvEa49qwcI\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 27261,
		"path": "../public/assets/utils-B6KiDbIe.js"
	},
	"/assets/ventes-Msd5RGzZ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7481-1ajuKy9wg/38Aq4uhe9XX5vBJ8o\"",
		"mtime": "2026-07-23T23:36:59.983Z",
		"size": 29825,
		"path": "../public/assets/ventes-Msd5RGzZ.js"
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

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
	"/assets/achats-DJQAriJK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1881-yW5KyHIAd/w5ojtGPeKZPp187xQ\"",
		"mtime": "2026-07-23T11:55:53.280Z",
		"size": 6273,
		"path": "../public/assets/achats-DJQAriJK.js"
	},
	"/assets/403-CK_gx81u.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"59a-dkmPXI2gL1wKBvMprl8tbVws/3E\"",
		"mtime": "2026-07-23T11:55:53.269Z",
		"size": 1434,
		"path": "../public/assets/403-CK_gx81u.js"
	},
	"/assets/AnimatePresence-nD1z_1WW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"113e-+48uJYbOQKqJjn8ZY6LkKScBdTU\"",
		"mtime": "2026-07-23T11:55:53.276Z",
		"size": 4414,
		"path": "../public/assets/AnimatePresence-nD1z_1WW.js"
	},
	"/assets/AppShell-DbN7w2Xb.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d47-gRYFPl1BfiQt70W075iOT1vQ1wE\"",
		"mtime": "2026-07-23T11:55:53.278Z",
		"size": 7495,
		"path": "../public/assets/AppShell-DbN7w2Xb.js"
	},
	"/assets/badge-C3WCDrHU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"473-3U6KGF8TUKhs1vlIdAt8OJVlSDI\"",
		"mtime": "2026-07-23T11:55:53.281Z",
		"size": 1139,
		"path": "../public/assets/badge-C3WCDrHU.js"
	},
	"/assets/assistant-2l4XiOb9.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1e4-ohfrsYcOL1/xNjYRi6W4/acFUQM\"",
		"mtime": "2026-07-23T11:55:53.281Z",
		"size": 484,
		"path": "../public/assets/assistant-2l4XiOb9.js"
	},
	"/assets/button-B4wT2XLW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"12bc-pi3lIzrCpkb2SSS/O4uK3MsEKDE\"",
		"mtime": "2026-07-23T11:55:53.282Z",
		"size": 4796,
		"path": "../public/assets/button-B4wT2XLW.js"
	},
	"/assets/chart-column-B4iWJBA4.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"fb-G3L+yqy34GjcHs4owxKk4Kg1cYA\"",
		"mtime": "2026-07-23T11:55:53.282Z",
		"size": 251,
		"path": "../public/assets/chart-column-B4iWJBA4.js"
	},
	"/assets/clients-UmipE-aq.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3d2-mop1PRdi1h5POZPB0QfBB4BwfXs\"",
		"mtime": "2026-07-23T11:55:53.283Z",
		"size": 978,
		"path": "../public/assets/clients-UmipE-aq.js"
	},
	"/assets/depenses-ByM5Th9A.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"995-79d0XHi1mD0lea5ecoULH7NW6x0\"",
		"mtime": "2026-07-23T11:55:53.283Z",
		"size": 2453,
		"path": "../public/assets/depenses-ByM5Th9A.js"
	},
	"/assets/createLucideIcon-CFVCT5Vk.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4cc-L7TfdsRWsuZ3FDbxHESbf3t7R9s\"",
		"mtime": "2026-07-23T11:55:53.283Z",
		"size": 1228,
		"path": "../public/assets/createLucideIcon-CFVCT5Vk.js"
	},
	"/assets/dialog-CNkkxuPU.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"882-bPr3kb3IPmxWg5LNOz4Eywro1no\"",
		"mtime": "2026-07-23T11:55:53.285Z",
		"size": 2178,
		"path": "../public/assets/dialog-CNkkxuPU.js"
	},
	"/assets/dist-CnQlmu6S.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1f6-tKW2nMIEbx06ggRXjPA+IQ9vPEI\"",
		"mtime": "2026-07-23T11:55:53.285Z",
		"size": 502,
		"path": "../public/assets/dist-CnQlmu6S.js"
	},
	"/assets/devis-C6dSyJ3E.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3f89-Q4ZHxtJdLrMOHUlgezbVQkgY0cU\"",
		"mtime": "2026-07-23T11:55:53.284Z",
		"size": 16265,
		"path": "../public/assets/devis-C6dSyJ3E.js"
	},
	"/assets/format-A9gweh3W.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30a-XYImF1jBbYk3sA5kFwezMeOu+Ik\"",
		"mtime": "2026-07-23T11:55:53.287Z",
		"size": 778,
		"path": "../public/assets/format-A9gweh3W.js"
	},
	"/assets/dist-DGWIpd3M.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"7596-to3icGajI0aTiCZj1AEGYRdAKfk\"",
		"mtime": "2026-07-23T11:55:53.286Z",
		"size": 30102,
		"path": "../public/assets/dist-DGWIpd3M.js"
	},
	"/assets/fournisseurs-BoUWDE7O.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3eb-mwX0fsAh8fwh3ohgkoCC173xIYc\"",
		"mtime": "2026-07-23T11:55:53.287Z",
		"size": 1003,
		"path": "../public/assets/fournisseurs-BoUWDE7O.js"
	},
	"/assets/dropdown-menu-Dnq9iWm6.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d085-XFVtng31M67i6fJ5XuvDwzZ2TWY\"",
		"mtime": "2026-07-23T11:55:53.286Z",
		"size": 53381,
		"path": "../public/assets/dropdown-menu-Dnq9iWm6.js"
	},
	"/assets/download-BHYHMPAM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"e8-rourCYrgzDg6meagBInx85MIM4Y\"",
		"mtime": "2026-07-23T11:55:53.286Z",
		"size": 232,
		"path": "../public/assets/download-BHYHMPAM.js"
	},
	"/assets/journal-CadJro1x.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"571-4lRjP/X63PchEje6jMxCaaQdbRM\"",
		"mtime": "2026-07-23T11:55:53.289Z",
		"size": 1393,
		"path": "../public/assets/journal-CadJro1x.js"
	},
	"/assets/input-BucZsU3M.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"3c6-pklauK2uDTq9FBmYQ0uUVLRFedY\"",
		"mtime": "2026-07-23T11:55:53.289Z",
		"size": 966,
		"path": "../public/assets/input-BucZsU3M.js"
	},
	"/assets/html2canvas-CshxQvNN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"30b8d-nt1FVLhcCKhaGHjxZjLX/QCcQ60\"",
		"mtime": "2026-07-23T11:55:53.287Z",
		"size": 199565,
		"path": "../public/assets/html2canvas-CshxQvNN.js"
	},
	"/assets/index.es-D-6hFQMe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"24f52-a5mf2WM6clHg47lmHHdfdiWzbso\"",
		"mtime": "2026-07-23T11:55:53.288Z",
		"size": 151378,
		"path": "../public/assets/index.es-D-6hFQMe.js"
	},
	"/assets/index-B2ZyXrRo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9dd59-LOqH7DZ43+TGFMoMQ60Yp2IOfws\"",
		"mtime": "2026-07-23T11:55:53.269Z",
		"size": 646489,
		"path": "../public/assets/index-B2ZyXrRo.js"
	},
	"/assets/jsx-runtime-DiK4U9sA.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b3-wXxXyswNhndByM42wnD5/FJtWq0\"",
		"mtime": "2026-07-23T11:55:53.289Z",
		"size": 435,
		"path": "../public/assets/jsx-runtime-DiK4U9sA.js"
	},
	"/assets/label-BSJo2udX.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"45d-nIiAIlemG0bzbaSUS8m2FUMbM/k\"",
		"mtime": "2026-07-23T11:55:53.290Z",
		"size": 1117,
		"path": "../public/assets/label-BSJo2udX.js"
	},
	"/assets/LineItemsDialog-ByEwp7ef.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"272a-BSnvnWc0HyYtrmFrealp4Y85mxE\"",
		"mtime": "2026-07-23T11:55:53.278Z",
		"size": 10026,
		"path": "../public/assets/LineItemsDialog-ByEwp7ef.js"
	},
	"/assets/loader-circle-753CjeZG.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"90-y3L9xGw0dIsm2b7LdJ5F6H3nxSI\"",
		"mtime": "2026-07-23T11:55:53.290Z",
		"size": 144,
		"path": "../public/assets/loader-circle-753CjeZG.js"
	},
	"/assets/mail-CTDcRdXE.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"d5-7BKRbY9BvKyTV0ylkcWOsTgxadw\"",
		"mtime": "2026-07-23T11:55:53.291Z",
		"size": 213,
		"path": "../public/assets/mail-CTDcRdXE.js"
	},
	"/assets/login-D4el3yOs.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"9792-DGrmebh/zYHJrO4VpZq+deR32+k\"",
		"mtime": "2026-07-23T11:55:53.291Z",
		"size": 38802,
		"path": "../public/assets/login-D4el3yOs.js"
	},
	"/assets/minus-5yun384u.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"10f-ETXuS/lpCZgaJEUQgaW63O7S9o4\"",
		"mtime": "2026-07-23T11:55:53.291Z",
		"size": 271,
		"path": "../public/assets/minus-5yun384u.js"
	},
	"/assets/parametres-DUF5-dPc.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"61c3-3VqeYPrLLtVsTkzKCUj+lhoFm30\"",
		"mtime": "2026-07-23T11:55:53.292Z",
		"size": 25027,
		"path": "../public/assets/parametres-DUF5-dPc.js"
	},
	"/assets/plus-BcKKCMkT.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"99-bX7DWVNvhm25WmTHovWSDAOhkzA\"",
		"mtime": "2026-07-23T11:55:53.292Z",
		"size": 153,
		"path": "../public/assets/plus-BcKKCMkT.js"
	},
	"/assets/proxy-BlmGJNMP.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d883-7v7AJVq82XjGg8fO2FNU1CGMYVU\"",
		"mtime": "2026-07-23T11:55:53.293Z",
		"size": 120963,
		"path": "../public/assets/proxy-BlmGJNMP.js"
	},
	"/assets/purify.es-DuRL7t6i.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"68ff-UzqdquwlS23jMr/0lDNWmxy5AL0\"",
		"mtime": "2026-07-23T11:55:53.293Z",
		"size": 26879,
		"path": "../public/assets/purify.es-DuRL7t6i.js"
	},
	"/assets/rapports-Bo5tyZ2r.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1bb7-m1e6yomL8CYXBOiX9Ljb1DCmyP8\"",
		"mtime": "2026-07-23T11:55:53.294Z",
		"size": 7095,
		"path": "../public/assets/rapports-Bo5tyZ2r.js"
	},
	"/assets/react-9ZasmZpi.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1d6c-TUNbcXoAcWz2cdRXtghoqoMFdow\"",
		"mtime": "2026-07-23T11:55:53.294Z",
		"size": 7532,
		"path": "../public/assets/react-9ZasmZpi.js"
	},
	"/assets/react-dom-CbJ76tum.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"dfb-RV1qmvY3C+Ax2oGQbVRNpy9LGqw\"",
		"mtime": "2026-07-23T11:55:53.294Z",
		"size": 3579,
		"path": "../public/assets/react-dom-CbJ76tum.js"
	},
	"/assets/ResourceTable-DwTSAfzQ.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1b38-VYHaYhKSm1JOvtlw6vZgpkM4w2E\"",
		"mtime": "2026-07-23T11:55:53.279Z",
		"size": 6968,
		"path": "../public/assets/ResourceTable-DwTSAfzQ.js"
	},
	"/assets/rolldown-runtime-CNC7AqOf.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"36f-poL7VEo+W3rlEpE8cNtjWDVI11g\"",
		"mtime": "2026-07-23T11:55:53.295Z",
		"size": 879,
		"path": "../public/assets/rolldown-runtime-CNC7AqOf.js"
	},
	"/assets/routes-Cu0SYZrM.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"1043b-UBLy58f4y3ozEcOilH2HP9SrCc0\"",
		"mtime": "2026-07-23T11:55:53.295Z",
		"size": 66619,
		"path": "../public/assets/routes-Cu0SYZrM.js"
	},
	"/assets/select-BBvVfdBe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"56cb-7XUQ+0KJeOkb7hbz1SwRTW4UEfE\"",
		"mtime": "2026-07-23T11:55:53.296Z",
		"size": 22219,
		"path": "../public/assets/select-BBvVfdBe.js"
	},
	"/assets/services-C6YuIGMe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"502-KoZswwgrDlgDcBnSNE3CEYHRY/E\"",
		"mtime": "2026-07-23T11:55:53.296Z",
		"size": 1282,
		"path": "../public/assets/services-C6YuIGMe.js"
	},
	"/assets/sheet-EPOgqNuN.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"2268-xbn72qstEXPuNaH5FXfZ9Z5RSxk\"",
		"mtime": "2026-07-23T11:55:53.297Z",
		"size": 8808,
		"path": "../public/assets/sheet-EPOgqNuN.js"
	},
	"/assets/pdf-template-engine-g0PFM3ea.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"699f6-V1kFKfxXQX0EB3Dq3Q/XaMZeVos\"",
		"mtime": "2026-07-23T11:55:53.292Z",
		"size": 432630,
		"path": "../public/assets/pdf-template-engine-g0PFM3ea.js"
	},
	"/assets/PieChart-DJnTa53u.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"63194-ss7MrEgkdqaDj/3mWfSHdEMsJ6w\"",
		"mtime": "2026-07-23T11:55:53.278Z",
		"size": 405908,
		"path": "../public/assets/PieChart-DJnTa53u.js"
	},
	"/assets/table-CZhEUaUl.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6b4-mOQQBFA19SkmVhy0wx3NV9MZCNg\"",
		"mtime": "2026-07-23T11:55:53.297Z",
		"size": 1716,
		"path": "../public/assets/table-CZhEUaUl.js"
	},
	"/assets/styles-DJJl3t6c.css": {
		"type": "text/css; charset=utf-8",
		"etag": "\"19c4f-20bbVqV7CtHCmYxd1p/xpwJO00c\"",
		"mtime": "2026-07-23T11:55:53.301Z",
		"size": 105551,
		"path": "../public/assets/styles-DJJl3t6c.css"
	},
	"/assets/tabs-Dorf_do_.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"f34-0XKMTJ4JdVE39GYHPlO8E7IuxJg\"",
		"mtime": "2026-07-23T11:55:53.298Z",
		"size": 3892,
		"path": "../public/assets/tabs-Dorf_do_.js"
	},
	"/assets/trash-2-B6Xxiwjo.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"227-kn8LsGsv9g/cqZZvl2YkjrdA3Lw\"",
		"mtime": "2026-07-23T11:55:53.298Z",
		"size": 551,
		"path": "../public/assets/trash-2-B6Xxiwjo.js"
	},
	"/assets/useMutation-BhkQElgK.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"8eb-raMCubSNYJrR+rJF/MlKJPa1PmM\"",
		"mtime": "2026-07-23T11:55:53.299Z",
		"size": 2283,
		"path": "../public/assets/useMutation-BhkQElgK.js"
	},
	"/assets/UserManagementTable-C0ACOze1.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"4a08-WKXttwLWbHS6ofIOUVb+vqmGThs\"",
		"mtime": "2026-07-23T11:55:53.279Z",
		"size": 18952,
		"path": "../public/assets/UserManagementTable-C0ACOze1.js"
	},
	"/assets/utilisateurs-CJ9o_fSW.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"cf-VRlmn7nPfh6gLndbKuOk4jPBG1I\"",
		"mtime": "2026-07-23T11:55:53.299Z",
		"size": 207,
		"path": "../public/assets/utilisateurs-CJ9o_fSW.js"
	},
	"/assets/utils-B6KiDbIe.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6a7d-iNkBSvaSyIjvZOzWoTvEa49qwcI\"",
		"mtime": "2026-07-23T11:55:53.299Z",
		"size": 27261,
		"path": "../public/assets/utils-B6KiDbIe.js"
	},
	"/assets/ventes-BErfordx.js": {
		"type": "text/javascript; charset=utf-8",
		"etag": "\"6504-pO/jUPROCM+vw95pMIButPerNoQ\"",
		"mtime": "2026-07-23T11:55:53.300Z",
		"size": 25860,
		"path": "../public/assets/ventes-BErfordx.js"
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

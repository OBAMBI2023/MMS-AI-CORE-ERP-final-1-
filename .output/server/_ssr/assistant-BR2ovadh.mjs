import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/assistant-BR2ovadh.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Assistant = (0, import_react.lazy)(() => import("./AssistantPage-DaYbcXg8.mjs").then((m) => ({ default: m.AssistantPage })));
var SplitComponent = () => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_react.Suspense, {
	fallback: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "Chargement de l'assistant..." }),
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Assistant, {})
});
//#endregion
export { SplitComponent as component };

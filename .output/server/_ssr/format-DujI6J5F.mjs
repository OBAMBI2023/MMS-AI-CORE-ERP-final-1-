//#region node_modules/.nitro/vite/services/ssr/assets/format-DujI6J5F.js
function formatCurrency(amount) {
	return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(amount || 0)).replace(/\u202F|\u00A0/g, " ") + " FCFA";
}
function formatNumber(n) {
	return n.toLocaleString("fr-FR");
}
function formatDate(d) {
	if (!d) return "-";
	const date = typeof d === "string" ? new Date(d) : d;
	if (isNaN(date.getTime())) return "-";
	return date.toLocaleDateString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric"
	});
}
function formatDateTime(d) {
	if (!d) return "-";
	const date = typeof d === "string" ? new Date(d) : d;
	if (isNaN(date.getTime())) return "-";
	return date.toLocaleString("fr-FR", {
		day: "2-digit",
		month: "2-digit",
		year: "numeric",
		hour: "2-digit",
		minute: "2-digit"
	});
}
function makeNumber(prefix) {
	const d = /* @__PURE__ */ new Date();
	return `${prefix}-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}-${Math.floor(Math.random() * 9e3 + 1e3)}`;
}
//#endregion
export { makeNumber as a, formatNumber as i, formatDate as n, formatDateTime as r, formatCurrency as t };

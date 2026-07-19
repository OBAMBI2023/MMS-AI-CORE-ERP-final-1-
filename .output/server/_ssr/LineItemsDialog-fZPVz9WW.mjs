import { a as __toESM } from "../_runtime.mjs";
import { t as motion } from "../_libs/framer-motion.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { E as Plus, H as LoaderCircle, d as Trash2, t as X } from "../_libs/lucide-react.mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { i as makeNumber, r as formatFCFA } from "./format-p1WSdr6g.mjs";
import { n as toast } from "../_libs/sonner.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/LineItemsDialog-fZPVz9WW.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var db = supabase;
function LineItemsDialog(props) {
	const { headerTable, itemsTable, fkColumn, partnerTable, partnerLabel, numberPrefix, singular, extraFields = [], initialId, onClose } = props;
	const qc = useQueryClient();
	const isEdit = Boolean(initialId);
	const [partnerId, setPartnerId] = (0, import_react.useState)("");
	const [partnerName, setPartnerName] = (0, import_react.useState)("");
	const [notes, setNotes] = (0, import_react.useState)("");
	const [items, setItems] = (0, import_react.useState)([{
		name: "",
		unit: "unité",
		qty: 1,
		price: 0
	}]);
	const [extra, setExtra] = (0, import_react.useState)({});
	const [discount, setDiscount] = (0, import_react.useState)(0);
	const { data: partners = [] } = useQuery({
		queryKey: [partnerTable ?? "no-partner"],
		queryFn: async () => {
			if (!partnerTable) return [];
			const { data, error } = await db.from(partnerTable).select("id, name").order("name", { ascending: true });
			if (error) throw error;
			return data ?? [];
		}
	});
	const { data: services = [] } = useQuery({
		queryKey: ["services", "active"],
		queryFn: async () => {
			const { data, error } = await db.from("services").select("id, name, unit, price").order("name", { ascending: true });
			if (error) throw error;
			return data ?? [];
		}
	});
	(0, import_react.useEffect)(() => {
		if (!isEdit || !initialId) return;
		(async () => {
			const { data: head, error: e1 } = await db.from(headerTable).select("*").eq("id", initialId).maybeSingle();
			if (e1 || !head) return;
			const h = head;
			setPartnerId(h[fkColumn.replace("_id", partnerTable === "clients" ? "_id" : "_id")] ?? "");
			setPartnerId(h[partnerTable === "clients" ? "client_id" : "fournisseur_id"] ?? "");
			setPartnerName(h[partnerTable === "clients" ? "client_name" : "fournisseur_name"] ?? "");
			setNotes(h.notes ?? "");
			setDiscount(Number(h.discount ?? 0));
			const ex = {};
			for (const f of extraFields) ex[f.name] = h[f.name] ?? "";
			setExtra(ex);
			const { data: rows } = await db.from(itemsTable).select("id, name, unit, qty, price").eq(fkColumn, initialId);
			const list = rows ?? [];
			if (list.length) setItems(list);
		})();
	}, [initialId, isEdit]);
	const subtotal = items.reduce((s, i) => s + Number(i.qty || 0) * Number(i.price || 0), 0);
	const total = Math.max(0, subtotal - Number(discount || 0));
	const saveMut = useMutation({
		mutationFn: async () => {
			const validItems = items.filter((i) => i.name && Number(i.qty) > 0);
			if (validItems.length === 0) throw new Error("Ajoutez au moins une ligne");
			const partnerFk = partnerTable === "clients" ? "client_id" : "fournisseur_id";
			const partnerNameCol = partnerTable === "clients" ? "client_name" : "fournisseur_name";
			const payload = {
				[partnerFk]: partnerId || null,
				[partnerNameCol]: partnerName || partners.find((p) => p.id === partnerId)?.name || null,
				subtotal,
				total,
				notes: notes || null,
				discount: headerTable === "devis" ? Number(discount || 0) : 0
			};
			for (const f of extraFields) payload[f.name] = extra[f.name] || null;
			let headerId = initialId;
			if (isEdit && headerId) {
				const { error } = await db.from(headerTable).update(payload).eq("id", headerId);
				if (error) throw error;
				await db.from(itemsTable).delete().eq(fkColumn, headerId);
			} else {
				payload.number = makeNumber(numberPrefix);
				console.log("Payload Achats :", payload);
				const ins = await db.from(headerTable).insert(payload).select("id").single();
				console.log("Insert Data :", ins.data);
				console.log("Insert Error :", ins.error);
				if (ins.error || !ins.data) throw ins.error ?? /* @__PURE__ */ new Error("Création échouée");
				headerId = ins.data.id;
			}
			const rows = validItems.map((i) => ({
				[fkColumn]: headerId,
				name: i.name,
				unit: i.unit || null,
				qty: Number(i.qty),
				price: Number(i.price),
				line_total: Number(i.qty) * Number(i.price)
			}));
			const { error: e2 } = await db.from(itemsTable).insert(rows);
			if (e2) throw e2;
		},
		onSuccess: () => {
			toast.success(isEdit ? `${singular} mis à jour` : `${singular} créé`);
			qc.invalidateQueries({ queryKey: [headerTable] });
			onClose();
		},
		onError: (e) => toast.error(e.message)
	});
	const updateItem = (idx, patch) => {
		setItems((arr) => arr.map((it, i) => i === idx ? {
			...it,
			...patch
		} : it));
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.div, {
		initial: { opacity: 0 },
		animate: { opacity: 1 },
		exit: { opacity: 0 },
		className: "fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4",
		onClick: onClose,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.form, {
			initial: {
				scale: .95,
				y: 12
			},
			animate: {
				scale: 1,
				y: 0
			},
			exit: {
				scale: .95,
				y: 12
			},
			onClick: (e) => e.stopPropagation(),
			onSubmit: (e) => {
				e.preventDefault();
				saveMut.mutate();
			},
			className: "w-full max-w-3xl rounded-2xl bg-card border border-border shadow-xl",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between px-6 py-4 border-b border-border",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
						className: "font-semibold",
						children: isEdit ? `Modifier ${singular.toLowerCase()}` : `Nouveau ${singular.toLowerCase()}`
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						className: "p-1 rounded-lg hover:bg-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" })
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-6 max-h-[75vh] overflow-y-auto space-y-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-4",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex flex-col gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-medium text-muted-foreground",
										children: partnerLabel
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: partnerId,
										onChange: (e) => {
											setPartnerId(e.target.value);
											setPartnerName("");
										},
										className: "w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											children: "— Sélectionner —"
										}), partners.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: p.id,
											children: p.name
										}, p.id))]
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex flex-col gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-medium text-muted-foreground",
										children: "Ou saisir un nom libre"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										value: partnerName,
										onChange: (e) => {
											setPartnerName(e.target.value);
											if (e.target.value) setPartnerId("");
										},
										className: "w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40"
									})]
								}),
								extraFields.map((f) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
									className: "flex flex-col gap-1.5",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
										className: "text-xs font-medium text-muted-foreground",
										children: f.label
									}), f.type === "select" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
										value: extra[f.name] ?? "",
										onChange: (e) => setExtra((s) => ({
											...s,
											[f.name]: e.target.value
										})),
										className: "w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: "",
											children: "—"
										}), (f.options ?? []).map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
											value: o,
											children: o
										}, o))]
									}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
										type: f.type ?? "text",
										value: extra[f.name] ?? "",
										onChange: (e) => setExtra((s) => ({
											...s,
											[f.name]: e.target.value
										})),
										className: "w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40"
									})]
								}, f.name))
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between mb-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
								className: "text-sm font-semibold",
								children: "Lignes"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
								type: "button",
								onClick: () => setItems((arr) => [...arr, {
									name: "",
									unit: "unité",
									qty: 1,
									price: 0
								}]),
								className: "inline-flex items-center gap-1 text-xs text-primary hover:underline",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-3.5 w-3.5" }), " Ajouter une ligne"]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "rounded-xl border border-border overflow-hidden",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-12 gap-2 px-3 py-2 bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground font-medium",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "col-span-5",
											children: "Désignation"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "col-span-2",
											children: "Unité"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "col-span-1 text-right",
											children: "Qté"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "col-span-2 text-right",
											children: "P.U."
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "col-span-1 text-right",
											children: "Total"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "col-span-1" })
									]
								}),
								items.map((it, idx) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "grid grid-cols-12 gap-2 px-3 py-2 border-t border-border items-center",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											list: "svc-list",
											value: it.name,
											onChange: (e) => {
												const v = e.target.value;
												const svc = services.find((s) => s.name === v);
												if (svc) updateItem(idx, {
													name: svc.name,
													unit: svc.unit,
													price: Number(svc.price)
												});
												else updateItem(idx, { name: v });
											},
											placeholder: "Service...",
											className: "col-span-5 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm outline-none focus:border-primary/40"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											value: it.unit,
											onChange: (e) => updateItem(idx, { unit: e.target.value }),
											className: "col-span-2 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm outline-none focus:border-primary/40"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											min: "0",
											step: "0.01",
											value: it.qty,
											onChange: (e) => updateItem(idx, { qty: Number(e.target.value) }),
											className: "col-span-1 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm text-right outline-none focus:border-primary/40"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											min: "0",
											step: "1",
											value: it.price,
											onChange: (e) => updateItem(idx, { price: Number(e.target.value) }),
											className: "col-span-2 rounded-lg bg-muted/60 border border-border px-2 py-1.5 text-sm text-right outline-none focus:border-primary/40"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "col-span-1 text-right text-sm font-medium",
											children: formatFCFA(Number(it.qty || 0) * Number(it.price || 0))
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
											className: "col-span-1 text-right",
											children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
												type: "button",
												onClick: () => setItems((a) => a.filter((_, i) => i !== idx)),
												className: "p-1 text-muted-foreground hover:text-destructive",
												children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
											})
										})
									]
								}, idx)),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("datalist", {
									id: "svc-list",
									children: services.map((s) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", { value: s.name }, s.id))
								})
							]
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "grid grid-cols-2 gap-4 items-end",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
								className: "flex flex-col gap-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-xs font-medium text-muted-foreground",
									children: "Notes"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
									rows: 2,
									value: notes,
									onChange: (e) => setNotes(e.target.value),
									className: "w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40"
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "rounded-xl bg-muted/40 p-4 space-y-2 text-sm",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted-foreground",
											children: "Sous-total"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: formatFCFA(subtotal) })]
									}),
									headerTable === "devis" && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between items-center",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-muted-foreground",
											children: "Remise"
										}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
											type: "number",
											min: "0",
											value: discount,
											onChange: (e) => setDiscount(Number(e.target.value)),
											className: "w-28 text-right rounded-lg bg-background border border-border px-2 py-1 text-sm outline-none"
										})]
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "flex justify-between pt-2 border-t border-border font-semibold text-base",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { children: "Total" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
											className: "text-primary",
											children: formatFCFA(total)
										})]
									})
								]
							})]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-end gap-2 px-6 py-4 border-t border-border bg-muted/20",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
						type: "button",
						onClick: onClose,
						className: "px-4 py-2 rounded-xl text-sm font-medium hover:bg-muted",
						children: "Annuler"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						type: "submit",
						disabled: saveMut.isPending,
						className: "inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-60",
						children: [saveMut.isPending && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), isEdit ? "Enregistrer" : "Créer"]
					})]
				})
			]
		})
	});
}
//#endregion
export { LineItemsDialog as t };

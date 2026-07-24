import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { L as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { K as LoaderCircle, P as Pencil, T as Search, f as Trash2, j as Plus, n as X } from "../_libs/lucide-react.mjs";
import { t as logAction } from "./audit.server-BZpRBTOA.mjs";
import { t as supabase } from "./client-BJMeE8ke.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as usePermissions } from "./use-permissions-CTEhPLNH.mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as useActionPermission } from "./use-action-permission-COP2a88W.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/ResourceTable-C0lgv-Hx.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var db = supabase;
function ResourceTable(props) {
	const { table, singular, plural, fields, columns, searchFields = [], orderBy, defaultValues = {}, renderActions, deletePermission, entityName } = props;
	const qc = useQueryClient();
	const [q, setQ] = (0, import_react.useState)("");
	const [editing, setEditing] = (0, import_react.useState)(null);
	const [creating, setCreating] = (0, import_react.useState)(false);
	const { data: userData } = useQuery({
		queryKey: ["user"],
		queryFn: () => supabase.auth.getUser()
	});
	const { roleId } = usePermissions().data || { roleId: null };
	const userId = userData?.data?.user?.id;
	const canDelete = deletePermission ? useActionPermission(deletePermission) : true;
	const canCreate = entityName ? useActionPermission(`${entityName}.create`) : true;
	const canEdit = entityName ? useActionPermission(`${entityName}.edit`) : true;
	const { data = [], isLoading } = useQuery({
		queryKey: [table],
		queryFn: async () => {
			const query = db.from(table).select("*");
			const { data, error } = await (orderBy ? query.order(orderBy.column, { ascending: orderBy.ascending ?? false }) : query);
			if (error) throw error;
			return data ?? [];
		}
	});
	const filtered = (0, import_react.useMemo)(() => {
		const s = q.trim().toLowerCase();
		if (!s) return data;
		return data.filter((row) => searchFields.some((f) => String(row[f] ?? "").toLowerCase().includes(s)));
	}, [
		data,
		q,
		searchFields
	]);
	const delMut = useMutation({
		mutationFn: async (row) => {
			const { error } = await db.from(table).delete().eq("id", row.id);
			if (error) throw error;
			return row;
		},
		onSuccess: async (row) => {
			if (userId && entityName) await logAction(userId, roleId, "delete", entityName, { id: row.id });
			toast.success(`${singular} supprimé`);
			qc.invalidateQueries({ queryKey: [table] });
		},
		onError: (e) => toast.error(e.message)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between flex-wrap gap-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative flex-1 min-w-[200px] max-w-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						value: q,
						onChange: (e) => setQ(e.target.value),
						placeholder: `Rechercher un ${singular.toLowerCase()}...`,
						className: "w-full rounded-xl bg-muted/60 border border-border pl-10 pr-4 py-2 text-sm outline-none focus:border-primary/40"
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center gap-3",
					children: [renderActions && renderActions(filtered), canCreate && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
						onClick: () => setCreating(true),
						className: "inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:opacity-90",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4" }),
							" Nouveau ",
							singular.toLowerCase()
						]
					})]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "rounded-2xl border border-border bg-card overflow-x-auto w-full",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-sm min-w-max",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-muted/40 text-muted-foreground text-xs uppercase tracking-wide",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [columns.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
							className: `text-left px-4 py-3 font-medium ${c.className ?? ""}`,
							children: c.header
						}, i)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", { className: "w-24" })] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						colSpan: columns.length + 1,
						className: "text-center py-12 text-muted-foreground",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-5 w-5 animate-spin mx-auto" })
					}) }) : filtered.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tr", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("td", {
						colSpan: columns.length + 1,
						className: "text-center py-12 text-muted-foreground",
						children: [
							"Aucun ",
							plural.toLowerCase(),
							" ",
							q ? "trouvé" : "pour l'instant",
							"."
						]
					}) }) : filtered.map((row) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t border-border hover:bg-muted/30 transition-colors",
						children: [columns.map((c, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: `px-4 py-3 ${c.className ?? ""}`,
							children: c.cell(row)
						}, i)), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
							className: "px-4 py-3",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex items-center justify-end gap-1",
								children: [canEdit && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setEditing(row),
									className: "p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground",
									"aria-label": "Modifier",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" })
								}), canDelete && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => {
										if (confirm(`Supprimer ce ${singular.toLowerCase()} ?`)) delMut.mutate(row);
									},
									className: "p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive",
									"aria-label": "Supprimer",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
								})]
							})
						})]
					}, row.id)) })]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: (creating || editing) && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ResourceFormDialog, {
				table,
				singular,
				fields,
				initial: editing ?? defaultValues,
				onClose: () => {
					setCreating(false);
					setEditing(null);
				}
			}) })
		]
	});
}
function ResourceFormDialog({ table, singular, fields, initial, onClose }) {
	const qc = useQueryClient();
	const isEdit = Boolean(initial.id);
	const [values, setValues] = (0, import_react.useState)(() => {
		const base = {};
		for (const f of fields) base[f.name] = initial[f.name] ?? "";
		return base;
	});
	const saveMut = useMutation({
		mutationFn: async () => {
			const payload = {};
			for (const f of fields) {
				let v = values[f.name];
				if (f.type === "number") v = v === "" || v === null ? null : Number(v);
				if (v === "") v = null;
				payload[f.name] = v;
			}
			if (isEdit) {
				const { error } = await db.from(table).update(payload).eq("id", initial.id);
				if (error) throw error;
			} else {
				const { error } = await db.from(table).insert(payload);
				if (error) throw error;
			}
		},
		onSuccess: () => {
			toast.success(isEdit ? `${singular} mis à jour` : `${singular} créé`);
			qc.invalidateQueries({ queryKey: [table] });
			onClose();
		},
		onError: (e) => toast.error(e.message)
	});
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
				for (const f of fields) if (f.required && !values[f.name]) {
					toast.error(`Le champ « ${f.label} » est requis`);
					return;
				}
				saveMut.mutate();
			},
			className: "w-full max-w-lg rounded-2xl bg-card border border-border shadow-xl",
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
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "p-6 grid grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto",
					children: fields.map((f) => {
						const span = (f.colSpan ?? (f.type === "textarea" ? 2 : 1)) === 2 ? "col-span-2" : "col-span-1";
						const commonProps = {
							value: values[f.name] ?? "",
							onChange: (e) => setValues((s) => ({
								...s,
								[f.name]: e.target.value
							})),
							required: f.required,
							placeholder: f.placeholder,
							className: "w-full rounded-xl bg-muted/60 border border-border px-3 py-2 text-sm outline-none focus:border-primary/40"
						};
						return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("label", {
							className: `${span} flex flex-col gap-1.5`,
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
								className: "text-xs font-medium text-muted-foreground",
								children: [f.label, f.required && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-destructive",
									children: " *"
								})]
							}), f.type === "textarea" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
								rows: 3,
								...commonProps
							}) : f.type === "select" ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("select", {
								...commonProps,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: "",
									children: "—"
								}), (f.options ?? []).map((o) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("option", {
									value: o,
									children: o
								}, o))]
							}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
								type: f.type ?? "text",
								step: f.step,
								...commonProps
							})]
						}, f.name);
					})
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
export { ResourceTable as t };

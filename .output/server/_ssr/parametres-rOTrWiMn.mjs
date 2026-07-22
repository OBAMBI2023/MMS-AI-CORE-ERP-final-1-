import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { A as Percent, E as Receipt, G as Image, H as LoaderCircle, J as Globe, L as MapPin, O as Plus, R as Mail, T as RotateCcw, W as KeyRound, X as FilePenLine, Y as FileText, a as Users, c as Upload, ct as CircleAlert, d as Trash2, ft as Check, j as Pencil, k as Phone, mt as Building2, n as X, nt as DatabaseBackup, st as CircleCheck, tt as Download, v as Shield, w as Save } from "../_libs/lucide-react.mjs";
import { a as DialogOverlay$1, c as DialogTrigger$1, i as DialogDescription$1, n as DialogClose, o as DialogPortal$1, r as DialogContent$1, s as DialogTitle$1, t as Dialog$1 } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { n as useSignedUrl } from "./use-company-settings-Bqa94T5s.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { t as Button } from "./button-Bq5vK6RO.mjs";
import { n as CheckboxIndicator, t as Checkbox$1 } from "../_libs/@radix-ui/react-checkbox+[...].mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as AppShell } from "./AppShell-DBY349Tw.mjs";
import { c as createServerFn, i as TSS_SERVER_FUNCTION } from "./createServerFn-CIHAFgYl.mjs";
import { i as stringType, n as numberType, r as objectType, t as booleanType } from "../_libs/zod.mjs";
import { n as Label, t as Input } from "./label-B7oQAA24.mjs";
import { t as getServerFnById } from "../__23tanstack-start-server-fn-resolver-D5NC0A-F.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-CCJRliUM.mjs";
import { t as Root } from "../_libs/radix-ui__react-separator.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/parametres-rOTrWiMn.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Dialog = Dialog$1;
var DialogTrigger = DialogTrigger$1;
var DialogPortal = DialogPortal$1;
var DialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay$1, {
	ref,
	className: cn("fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props
}));
DialogOverlay.displayName = DialogOverlay$1.displayName;
var DialogContent = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent$1, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
		className: "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background cursor-pointer transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "h-4 w-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "sr-only",
			children: "Close"
		})]
	})]
})] }));
DialogContent.displayName = DialogContent$1.displayName;
var DialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-1.5 text-center sm:text-left", className),
	...props
});
DialogHeader.displayName = "DialogHeader";
var DialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
DialogFooter.displayName = "DialogFooter";
var DialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle$1, {
	ref,
	className: cn("text-lg font-semibold leading-none tracking-tight", className),
	...props
}));
DialogTitle.displayName = DialogTitle$1.displayName;
var DialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogDescription$1, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
DialogDescription.displayName = DialogDescription$1.displayName;
var Textarea = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Textarea.displayName = "Textarea";
var Checkbox = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox$1, {
	ref,
	className: cn("grid place-content-center peer h-4 w-4 shrink-0 rounded-sm border border-primary shadow cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CheckboxIndicator, {
		className: cn("grid place-content-center text-current"),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" })
	})
}));
Checkbox.displayName = Checkbox$1.displayName;
function RolesManagement() {
	const qc = useQueryClient();
	const { data: roles, isLoading } = useQuery({
		queryKey: ["roles"],
		queryFn: async () => {
			const { data, error } = await supabase.from("roles").select("*, role_permissions(permission_id, permissions(code))");
			if (error) throw error;
			return data;
		}
	});
	const { data: allPermissions } = useQuery({
		queryKey: ["permissions"],
		queryFn: async () => {
			const { data, error } = await supabase.from("permissions").select("*");
			if (error) throw error;
			return data;
		}
	});
	const deleteRole = useMutation({
		mutationFn: async (id) => {
			const { error } = await supabase.from("roles").delete().eq("id", id);
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Rôle supprimé");
			qc.invalidateQueries({ queryKey: ["roles"] });
		}
	});
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin h-8 w-8 mx-auto my-10" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex justify-between items-center",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "text-xl font-semibold",
				children: "Gestion des rôles"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoleDialog, { permissions: allPermissions || [] })]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "grid gap-3",
			children: roles?.map((role) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-4 border border-border rounded-xl bg-card flex items-center justify-between shadow-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-semibold text-base",
					children: role.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-sm text-muted-foreground",
					children: role.description
				})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex gap-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RoleDialog, {
						role,
						permissions: allPermissions || []
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "ghost",
						size: "sm",
						className: "text-destructive hover:text-destructive/90",
						onClick: () => {
							if (confirm("Supprimer ce rôle ?")) deleteRole.mutate(role.id);
						},
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-4 w-4" })
					})]
				})]
			}, role.id))
		})]
	});
}
function RoleDialog({ role, permissions }) {
	const qc = useQueryClient();
	const [open, setOpen] = (0, import_react.useState)(false);
	const [name, setName] = (0, import_react.useState)(role?.name || "");
	const [description, setDescription] = (0, import_react.useState)(role?.description || "");
	const [selectedPermissions, setSelectedPermissions] = (0, import_react.useState)(role?.role_permissions?.map((rp) => rp.permission_id) || []);
	const modules = (0, import_react.useMemo)(() => {
		const m = {};
		permissions.forEach((p) => {
			const mod = p.code.split(".")[0];
			if (!m[mod]) m[mod] = [];
			m[mod].push(p);
		});
		return m;
	}, [permissions]);
	const saveRole = useMutation({
		mutationFn: async () => {
			if (role) {
				const { error: roleError } = await supabase.from("roles").update({
					name,
					description
				}).eq("id", role.id);
				if (roleError) throw roleError;
				await supabase.from("role_permissions").delete().eq("role_id", role.id);
				if (selectedPermissions.length > 0) {
					const { error } = await supabase.from("role_permissions").insert(selectedPermissions.map((pid) => ({
						role_id: role.id,
						permission_id: pid
					})));
					if (error) throw error;
				}
			} else {
				const { data: newRole, error: roleError } = await supabase.from("roles").insert({
					name,
					description
				}).select().single();
				if (roleError) throw roleError;
				if (selectedPermissions.length > 0) {
					const { error } = await supabase.from("role_permissions").insert(selectedPermissions.map((pid) => ({
						role_id: newRole.id,
						permission_id: pid
					})));
					if (error) throw error;
				}
			}
		},
		onSuccess: () => {
			toast.success("Rôle enregistré");
			setOpen(false);
			qc.invalidateQueries({ queryKey: ["roles"] });
		}
	});
	const toggleAll = (checked) => {
		if (checked) setSelectedPermissions(permissions.map((p) => p.id));
		else setSelectedPermissions([]);
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				variant: role ? "outline" : "default",
				size: role ? "icon" : "default",
				children: role ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 mr-2" }), " Créer"] })
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-4xl max-h-[90vh] overflow-y-auto",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
					className: "text-xl",
					children: role ? "Modifier le rôle" : "Créer un rôle"
				}) }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-1 md:grid-cols-2 gap-6 py-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Nom du rôle" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								value: name,
								onChange: (e) => setName(e.target.value)
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-1.5",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Description" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								value: description,
								onChange: (e) => setDescription(e.target.value),
								rows: 4
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "border rounded-xl p-4 bg-muted/30",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center justify-between mb-4",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
								className: "text-base",
								children: "Permissions"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "flex gap-1",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => toggleAll(true),
									className: "text-xs",
									children: "Tout cocher"
								}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
									variant: "ghost",
									size: "sm",
									onClick: () => toggleAll(false),
									className: "text-xs",
									children: "Tout décocher"
								})]
							})]
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-1 sm:grid-cols-2 gap-4",
							children: Object.entries(modules).map(([mod, perms]) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-2",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
									className: "font-semibold text-sm capitalize text-muted-foreground",
									children: mod
								}), perms.map((p) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex items-center space-x-2",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Checkbox, {
										id: p.id,
										checked: selectedPermissions.includes(p.id),
										onCheckedChange: (checked) => {
											if (checked) setSelectedPermissions([...selectedPermissions, p.id]);
											else setSelectedPermissions(selectedPermissions.filter((id) => id !== p.id));
										}
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("label", {
										htmlFor: p.id,
										className: "text-sm cursor-pointer",
										children: p.code.split(".")[1]
									})]
								}, p.id))]
							}, mod))
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
					variant: "outline",
					onClick: () => setOpen(false),
					children: "Annuler"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => saveRole.mutate(),
					disabled: saveRole.isPending,
					children: [saveRole.isPending && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 mr-2 animate-spin" }), "Enregistrer"]
				})] })
			]
		})]
	});
}
var badgeVariants = cva("inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2", {
	variants: { variant: {
		default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
		secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
		destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
		outline: "text-foreground"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: cn(badgeVariants({ variant }), className),
		...props
	});
}
var Separator = import_react.forwardRef(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
	ref,
	decorative,
	orientation,
	className: cn("shrink-0 bg-border", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className),
	...props
}));
Separator.displayName = Root.displayName;
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var aiSettingsSchema = objectType({
	openai_key: stringType().nullable().optional(),
	gemini_key: stringType().nullable().optional(),
	claude_key: stringType().nullable().optional(),
	ai_model: stringType().nullable().optional(),
	ai_temperature: numberType().min(0).max(1).nullable().optional(),
	ai_max_tokens: numberType().int().positive().max(32e3).nullable().optional(),
	ai_enabled: booleanType().optional()
});
var getAiSettings = createServerFn({ method: "GET" }).handler(createSsrRpc("9a3bc6fc671b55398bf3d21bd82a687b5fb0fb07a99d7449488fae6c2253824a"));
var saveAiSettings = createServerFn({ method: "POST" }).validator(aiSettingsSchema).handler(createSsrRpc("5a85795cad4995fdcd35c6381fb5c7855b64b7f42945b72884c432b833d2cfd7"));
var BUCKET = "company-assets";
var MAX_MB = 2;
var ACCEPTED = [
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/svg+xml"
];
function ParametresPage() {
	const qc = useQueryClient();
	const AI_FIELD_NAMES = [
		"openai_key",
		"gemini_key",
		"claude_key",
		"ai_model",
		"ai_temperature",
		"ai_max_tokens",
		"ai_enabled"
	];
	function splitPatch(patch) {
		const aiPatch = {};
		const paramPatch = {};
		for (const [key, value] of Object.entries(patch)) if (AI_FIELD_NAMES.includes(key)) aiPatch[key] = value;
		else paramPatch[key] = value;
		return {
			aiPatch,
			paramPatch
		};
	}
	const { data, isLoading } = useQuery({
		queryKey: ["parametres"],
		queryFn: async () => {
			const [{ data: params, error }, aiSettings] = await Promise.all([supabase.from("parametres").select("*").limit(1).maybeSingle(), getAiSettings()]);
			if (error) throw error;
			if (!params) return null;
			return {
				...params,
				...aiSettings
			};
		}
	});
	const [form, setForm] = (0, import_react.useState)({});
	const initialized = (0, import_react.useRef)(false);
	(0, import_react.useEffect)(() => {
		if (data && !initialized.current) {
			setForm(data);
			initialized.current = true;
		}
	}, [data]);
	const update = (key, value) => setForm((s) => ({
		...s,
		[key]: value
	}));
	const save = useMutation({
		mutationFn: async (patch) => {
			if (!data?.id) throw new Error("Enregistrement introuvable");
			const { aiPatch, paramPatch } = splitPatch(patch);
			const tasks = [];
			if (Object.keys(paramPatch).length > 0) tasks.push(supabase.from("parametres").update(paramPatch).eq("id", data.id).then(({ error }) => {
				if (error) throw error;
			}));
			if (Object.keys(aiPatch).length > 0) tasks.push(saveAiSettings({ data: aiPatch }));
			await Promise.all(tasks);
		},
		onSuccess: () => {
			toast.success("Paramètres enregistrés");
			qc.invalidateQueries({ queryKey: ["parametres"] });
		},
		onError: (e) => toast.error(e.message)
	});
	const saveAll = () => save.mutate(form);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Paramètres",
		subtitle: "Centre de configuration de l'entreprise",
		actions: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
			onClick: saveAll,
			disabled: save.isPending || isLoading,
			className: "gap-2",
			children: [save.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }), "Enregistrer"]
		}),
		children: isLoading || !data ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex items-center gap-2 text-muted-foreground",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }), " Chargement…"]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "min-w-0",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Tabs, {
					defaultValue: "general",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsList, {
							className: "mb-6 flex flex-wrap h-auto p-1 bg-muted/60 rounded-xl",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabTrig, {
									value: "general",
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-4 w-4" }),
									children: "Générales"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabTrig, {
									value: "legal",
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-4 w-4" }),
									children: "Légales"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabTrig, {
									value: "billing",
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Receipt, { className: "h-4 w-4" }),
									children: "Facturation"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabTrig, {
									value: "documents",
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilePenLine, { className: "h-4 w-4" }),
									children: "Documents"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabTrig, {
									value: "users",
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-4 w-4" }),
									children: "Utilisateurs"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabTrig, {
									value: "security",
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4" }),
									children: "Sécurité"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "general",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(GeneralTab, {
								form,
								update,
								settingsId: data.id,
								onSave: save.mutate
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "legal",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LegalTab, {
								form,
								update
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "billing",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(BillingTab, {
								form,
								update
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "documents",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DocumentsTab, {
								form,
								update,
								settingsId: data.id,
								onSave: save.mutate
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "users",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsersTab, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsContent, {
							value: "security",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SecurityTab, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "mt-6",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConnectionLogsTab, {})
							})]
						})
					]
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
				className: "space-y-6",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(CompanyPreview, { form }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(ConfigStatus, { form }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(QuickActions, {
						form,
						settingsId: data.id,
						refetch: () => qc.invalidateQueries({ queryKey: ["parametres"] })
					})
				]
			})]
		})
	});
}
function TabTrig({ value, icon, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TabsTrigger, {
		value,
		className: "gap-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm",
		children: [icon, /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "hidden sm:inline",
			children
		})]
	});
}
function Card({ title, description, icon, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-2xl border border-border bg-card shadow-sm",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "px-6 py-4 border-b border-border flex items-start gap-3",
			children: [icon && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-0.5 p-2 rounded-lg bg-primary/10 text-primary",
				children: icon
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex-1 min-w-0",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "font-semibold text-base",
					children: title
				}), description && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground mt-0.5",
					children: description
				})]
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-6",
			children
		})]
	});
}
function Field({ label, required, children, hint }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-1.5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Label, {
				className: "text-xs font-medium text-muted-foreground",
				children: [label, required && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "text-destructive ml-0.5",
					children: "*"
				})]
			}),
			children,
			hint && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] text-muted-foreground",
				children: hint
			})
		]
	});
}
function GeneralTab({ form, update, settingsId, onSave }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Logo de l'entreprise",
			description: "PNG, JPG ou SVG — 2 Mo max.",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Image, { className: "h-4 w-4" }),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileUploader, {
				currentPath: form.logo_url ?? null,
				folder: "logo",
				settingsId,
				onChange: (path) => {
					update("logo_url", path);
					onSave({ logo_url: path });
				}
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Coordonnées",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-4 w-4" }),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Raison sociale",
						required: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: form.company_name ?? "",
							onChange: (e) => update("company_name", e.target.value),
							required: true
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Nom commercial",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: form.trade_name ?? "",
							onChange: (e) => update("trade_name", e.target.value || null)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Téléphone",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: form.phone ?? "",
							onChange: (e) => update("phone", e.target.value || null)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "WhatsApp",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: form.whatsapp ?? "",
							onChange: (e) => update("whatsapp", e.target.value || null)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Email",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "email",
							value: form.email ?? "",
							onChange: (e) => update("email", e.target.value || null)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Site web",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							placeholder: "https://…",
							value: form.website ?? "",
							onChange: (e) => update("website", e.target.value || null)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Ville",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: form.city ?? "",
							onChange: (e) => update("city", e.target.value || null)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Pays",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: form.country ?? "",
							onChange: (e) => update("country", e.target.value || null)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "md:col-span-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Adresse",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Textarea, {
								rows: 2,
								value: form.address ?? "",
								onChange: (e) => update("address", e.target.value || null)
							})
						})
					})
				]
			})
		})]
	});
}
function LegalTab({ form, update }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		title: "Informations légales",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-4 w-4" }),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-1 md:grid-cols-2 gap-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "RCCM",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: form.rccm ?? "",
						onChange: (e) => update("rccm", e.target.value || null)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Numéro fiscal (NIF)",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: form.tax_number ?? "",
						onChange: (e) => update("tax_number", e.target.value || null)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Régime fiscal",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: form.tax_regime ?? void 0,
						onValueChange: (v) => update("tax_regime", v),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Sélectionner…" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "Réel",
								children: "Régime du réel"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "Simplifié",
								children: "Régime simplifié"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "Micro-entreprise",
								children: "Micro-entreprise"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "Non assujetti",
								children: "Non assujetti"
							})
						] })]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Taux TVA (%)",
					hint: "Laisser vide si non applicable",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							step: "0.01",
							min: "0",
							max: "100",
							value: form.vat_rate ?? "",
							onChange: (e) => update("vat_rate", e.target.value === "" ? null : Number(e.target.value))
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Percent, { className: "absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" })]
					})
				})
			]
		})
	});
}
function BillingTab({ form, update }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		title: "Facturation",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Receipt, { className: "h-4 w-4" }),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-1 md:grid-cols-2 gap-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Devise",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: form.currency ?? "FCFA",
						onValueChange: (v) => update("currency", v),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "FCFA",
								children: "FCFA (F CFA)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "USD",
								children: "USD ($)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "EUR",
								children: "EUR (€)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "GBP",
								children: "GBP (£)"
							})
						] })]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Décimales",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "number",
						min: "0",
						max: "4",
						value: form.decimals ?? 0,
						onChange: (e) => update("decimals", Number(e.target.value))
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Préfixe devis",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: form.quote_prefix ?? "",
						onChange: (e) => update("quote_prefix", e.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Préfixe facture",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: form.invoice_prefix ?? "",
						onChange: (e) => update("invoice_prefix", e.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Préfixe reçu",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						value: form.receipt_prefix ?? "",
						onChange: (e) => update("receipt_prefix", e.target.value)
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Format de date",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: form.date_format ?? "dd/MM/yyyy",
						onValueChange: (v) => update("date_format", v),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "dd/MM/yyyy",
								children: "31/12/2026"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "MM/dd/yyyy",
								children: "12/31/2026"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "yyyy-MM-dd",
								children: "2026-12-31"
							})
						] })]
					})
				})
			]
		})
	});
}
function DocumentsTab({ form, update, settingsId, onSave }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-1 md:grid-cols-2 gap-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Signature",
			description: "Image de la signature du responsable.",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilePenLine, { className: "h-4 w-4" }),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileUploader, {
				currentPath: form.signature_url ?? null,
				folder: "signature",
				settingsId,
				onChange: (path) => {
					update("signature_url", path);
					onSave({ signature_url: path });
				}
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Cachet / Tampon",
			description: "Image du cachet officiel.",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FilePenLine, { className: "h-4 w-4" }),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileUploader, {
				currentPath: form.stamp_url ?? null,
				folder: "stamp",
				settingsId,
				onChange: (path) => {
					update("stamp_url", path);
					onSave({ stamp_url: path });
				}
			})
		})]
	});
}
function UsersTab() {
	const { data: users, isLoading } = useQuery({
		queryKey: ["users"],
		queryFn: async () => {
			const { data, error } = await supabase.from("profiles").select("*, roles(name)");
			if (error) throw error;
			return data;
		}
	});
	const { data: roles } = useQuery({
		queryKey: ["roles"],
		queryFn: async () => {
			const { data, error } = await supabase.from("roles").select("*");
			if (error) throw error;
			return data;
		}
	});
	const updateRole = useMutation({
		mutationFn: async ({ userId, roleId }) => {
			const { error } = await supabase.from("profiles").update({ role_id: roleId }).eq("id", userId);
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Rôle mis à jour");
		}
	});
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin" });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		title: "Utilisateurs",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-4 w-4" }),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "border rounded-lg overflow-hidden",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
				className: "w-full text-sm",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
					className: "bg-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "p-3 text-left",
						children: "Utilisateur"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
						className: "p-3 text-left",
						children: "Rôle"
					})] })
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: users?.map((user) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
					className: "border-t",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "p-3",
						children: user.full_name || user.username || "Sans nom"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
						className: "p-3",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
							defaultValue: user.role_id || "",
							onValueChange: (v) => updateRole.mutate({
								userId: user.id,
								roleId: v
							}),
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, {
								className: "w-[180px]",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Sélectionner…" })
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: roles?.map((role) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: role.id,
								children: role.name
							}, role.id)) })]
						})
					})]
				}, user.id)) })]
			})
		})
	});
}
function ConnectionLogsTab() {
	const { data: logs, isLoading, refetch } = useQuery({
		queryKey: ["connection-logs"],
		queryFn: async () => {
			const { data, error } = await supabase.from("connection_logs").select("*").order("created_at", { ascending: false });
			if (error) throw error;
			return data;
		}
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		title: "Journal des connexions",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-4 w-4" }),
		children: isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex items-center justify-center p-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin h-5 w-5" })
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "space-y-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				onClick: () => refetch(),
				variant: "outline",
				size: "sm",
				children: "Actualiser"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border rounded-lg overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("table", {
					className: "w-full text-sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("thead", {
						className: "bg-muted",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-3 text-left",
								children: "Date"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-3 text-left",
								children: "Email"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("th", {
								className: "p-3 text-left",
								children: "Statut"
							})
						] })
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("tbody", { children: logs?.map((log) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("tr", {
						className: "border-t",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "p-3",
								children: new Date(log.created_at).toLocaleString()
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "p-3",
								children: log.email
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("td", {
								className: "p-3",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
									variant: log.status === "success" ? "default" : "destructive",
									children: log.status === "success" ? "Succès" : "Échec"
								})
							})
						]
					}, log.id)) })]
				})
			})]
		})
	});
}
function SecurityTab() {
	const [pwd, setPwd] = (0, import_react.useState)("");
	const [pwd2, setPwd2] = (0, import_react.useState)("");
	const changing = useMutation({
		mutationFn: async () => {
			if (pwd.length < 8) throw new Error("Minimum 8 caractères");
			if (pwd !== pwd2) throw new Error("Les mots de passe ne correspondent pas");
			const { error } = await supabase.auth.updateUser({ password: pwd });
			if (error) throw error;
		},
		onSuccess: () => {
			toast.success("Mot de passe mis à jour");
			setPwd("");
			setPwd2("");
		},
		onError: (e) => toast.error(e.message)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Mot de passe",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-4 w-4" }),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 gap-4",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Nouveau mot de passe",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "password",
						value: pwd,
						onChange: (e) => setPwd(e.target.value)
					})
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Confirmer",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
						type: "password",
						value: pwd2,
						onChange: (e) => setPwd2(e.target.value)
					})
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => changing.mutate(),
					disabled: changing.isPending || !pwd,
					children: [changing.isPending && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin mr-2" }), "Changer le mot de passe"]
				})
			})]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
			title: "Sécurité & Journal",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4" }),
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 md:grid-cols-3 gap-3",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							variant: "outline",
							className: "justify-start gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-4 w-4" }), " Gestion des rôles"]
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogContent, {
						className: "max-w-3xl",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RolesManagement, {})
					})] }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						className: "justify-start gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(FileText, { className: "h-4 w-4" }), " Journal des connexions"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						className: "justify-start gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DatabaseBackup, { className: "h-4 w-4" }), " Sauvegarde"]
					})
				]
			})
		})]
	});
}
function FileUploader({ currentPath, folder, settingsId, onChange }) {
	const [dragging, setDragging] = (0, import_react.useState)(false);
	const [busy, setBusy] = (0, import_react.useState)(false);
	const inputRef = (0, import_react.useRef)(null);
	const previewUrl = useSignedUrl(currentPath);
	const handleFile = (0, import_react.useCallback)(async (file) => {
		if (!ACCEPTED.includes(file.type)) return toast.error("Format non supporté (PNG, JPG, SVG)");
		if (file.size > MAX_MB * 1024 * 1024) return toast.error(`Taille max ${MAX_MB} Mo`);
		setBusy(true);
		try {
			const ext = file.name.split(".").pop() || "png";
			const path = `${folder}/${settingsId}-${Date.now()}.${ext}`;
			if (currentPath) await supabase.storage.from(BUCKET).remove([currentPath]).catch(() => {});
			const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
				upsert: true,
				contentType: file.type
			});
			if (error) throw error;
			onChange(path);
			toast.success("Fichier téléversé");
		} catch (e) {
			toast.error(e.message);
		} finally {
			setBusy(false);
		}
	}, [
		currentPath,
		folder,
		settingsId,
		onChange
	]);
	const remove = async () => {
		if (!currentPath) return;
		setBusy(true);
		try {
			await supabase.storage.from(BUCKET).remove([currentPath]);
			onChange(null);
			toast.success("Fichier supprimé");
		} finally {
			setBusy(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		onDragOver: (e) => {
			e.preventDefault();
			setDragging(true);
		},
		onDragLeave: () => setDragging(false),
		onDrop: (e) => {
			e.preventDefault();
			setDragging(false);
			const file = e.dataTransfer.files?.[0];
			if (file) handleFile(file);
		},
		className: `relative rounded-xl border-2 border-dashed transition-colors p-6 flex flex-col items-center justify-center gap-3 text-center ${dragging ? "border-primary bg-primary/5" : "border-border bg-muted/20"}`,
		children: [previewUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "flex flex-col items-center gap-3 w-full",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-28 w-28 rounded-xl border border-border bg-background flex items-center justify-center overflow-hidden",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
					src: previewUrl,
					alt: "aperçu",
					className: "max-h-full max-w-full object-contain"
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex gap-2",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					variant: "outline",
					onClick: () => inputRef.current?.click(),
					disabled: busy,
					className: "gap-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "h-3.5 w-3.5" }), " Remplacer"]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					size: "sm",
					variant: "outline",
					onClick: remove,
					disabled: busy,
					className: "gap-2 text-destructive hover:text-destructive",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "h-3.5 w-3.5" }), " Supprimer"]
				})]
			})]
		}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center",
				children: busy ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-5 w-5 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "h-5 w-5" })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-sm font-medium",
				children: "Glissez un fichier ici"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("p", {
				className: "text-xs text-muted-foreground mt-1",
				children: [
					"PNG, JPG, SVG — max ",
					MAX_MB,
					" Mo"
				]
			})] }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
				size: "sm",
				variant: "outline",
				onClick: () => inputRef.current?.click(),
				disabled: busy,
				children: "Choisir un fichier"
			})
		] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
			ref: inputRef,
			type: "file",
			accept: ACCEPTED.join(","),
			className: "hidden",
			onChange: (e) => {
				const f = e.target.files?.[0];
				if (f) handleFile(f);
				e.target.value = "";
			}
		})]
	});
}
function CompanyPreview({ form }) {
	const logo = useSignedUrl(form.logo_url ?? null);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-2xl border border-border bg-card shadow-sm overflow-hidden",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "h-20 bg-gradient-to-br from-primary/15 via-primary/5 to-transparent" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "px-5 pb-5 -mt-10",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-20 w-20 rounded-2xl bg-background border border-border shadow-sm flex items-center justify-center overflow-hidden",
					children: logo ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
						src: logo,
						alt: "logo",
						className: "max-h-full max-w-full object-contain"
					}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Building2, { className: "h-8 w-8 text-muted-foreground" })
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "mt-3 font-semibold text-lg leading-tight truncate",
					children: form.company_name || "Nom de l'entreprise"
				}),
				form.trade_name && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-xs text-muted-foreground",
					children: form.trade_name
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mt-4 space-y-2 text-sm",
					children: [
						form.address && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Line, {
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MapPin, { className: "h-3.5 w-3.5" }),
							children: [form.address, form.city ? `, ${form.city}` : ""]
						}),
						form.phone && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Phone, { className: "h-3.5 w-3.5" }),
							children: form.phone
						}),
						form.email && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "h-3.5 w-3.5" }),
							children: form.email
						}),
						form.website && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Line, {
							icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Globe, { className: "h-3.5 w-3.5" }),
							children: form.website
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Separator, { className: "my-4" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
					className: "grid grid-cols-2 gap-3 text-xs",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meta, {
							label: "RCCM",
							value: form.rccm
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meta, {
							label: "NIF",
							value: form.tax_number
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meta, {
							label: "TVA",
							value: form.vat_rate != null ? `${form.vat_rate}%` : null
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Meta, {
							label: "Devise",
							value: form.currency
						})
					]
				})
			]
		})]
	});
}
function Line({ icon, children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-start gap-2 text-muted-foreground",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "mt-0.5",
			children: icon
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-foreground truncate",
			children
		})]
	});
}
function Meta({ label, value }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
		className: "text-muted-foreground",
		children: label
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
		className: "font-medium mt-0.5",
		children: value || /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
			className: "text-muted-foreground",
			children: "—"
		})
	})] });
}
function ConfigStatus({ form }) {
	const items = (0, import_react.useMemo)(() => [
		{
			label: "Informations générales",
			ok: !!(form.company_name && form.phone && form.email)
		},
		{
			label: "Logo",
			ok: !!form.logo_url
		},
		{
			label: "Informations légales",
			ok: !!(form.rccm || form.tax_number)
		},
		{
			label: "TVA",
			ok: form.vat_rate != null
		},
		{
			label: "Facturation",
			ok: !!(form.currency && form.invoice_prefix)
		},
		{
			label: "Administrateur",
			ok: true
		},
		{
			label: "Sauvegarde",
			ok: false
		}
	], [form]);
	const done = items.filter((i) => i.ok).length;
	const pct = Math.round(done / items.length * 100);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-2xl border border-border bg-card shadow-sm p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex items-center justify-between mb-3",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "font-semibold text-sm",
					children: "Configuration"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Badge, {
					variant: "secondary",
					children: [
						done,
						"/",
						items.length
					]
				})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "h-1.5 rounded-full bg-muted overflow-hidden mb-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "h-full bg-primary transition-all",
					style: { width: `${pct}%` }
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "space-y-2",
				children: items.map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "flex items-center gap-2 text-sm",
					children: [
						i.ok ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleCheck, { className: "h-4 w-4 text-emerald-600" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(CircleAlert, { className: "h-4 w-4 text-amber-500" }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: i.ok ? "" : "text-muted-foreground",
							children: i.label
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "ml-auto text-[11px] text-muted-foreground",
							children: i.ok ? "Configuré" : "À compléter"
						})
					]
				}, i.label))
			})
		]
	});
}
function QuickActions({ form, settingsId, refetch }) {
	const fileInput = (0, import_react.useRef)(null);
	const exportCfg = () => {
		const blob = new Blob([JSON.stringify(form, null, 2)], { type: "application/json" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `parametres-${(/* @__PURE__ */ new Date()).toISOString().slice(0, 10)}.json`;
		a.click();
		URL.revokeObjectURL(url);
		toast.success("Configuration exportée");
	};
	const AI_KEYS = [
		"openai_key",
		"gemini_key",
		"claude_key",
		"ai_model",
		"ai_temperature",
		"ai_max_tokens",
		"ai_enabled"
	];
	const importCfg = async (file) => {
		try {
			const text = await file.text();
			const { id, created_at, updated_at, ...clean } = JSON.parse(text);
			const aiPatch = {};
			const paramPatch = {};
			for (const [key, value] of Object.entries(clean)) if (AI_KEYS.includes(key)) aiPatch[key] = value;
			else paramPatch[key] = value;
			if (Object.keys(paramPatch).length > 0) {
				const { error } = await supabase.from("parametres").update(paramPatch).eq("id", settingsId);
				if (error) throw error;
			}
			if (Object.keys(aiPatch).length > 0) await saveAiSettings({ data: aiPatch });
			refetch();
			toast.success("Configuration importée");
		} catch (e) {
			toast.error(e.message);
		}
	};
	const reset = async () => {
		if (!confirm("Réinitialiser tous les paramètres aux valeurs par défaut ?")) return;
		const { error } = await supabase.from("parametres").update({
			trade_name: null,
			address: null,
			city: null,
			country: null,
			phone: null,
			whatsapp: null,
			email: null,
			website: null,
			rccm: null,
			tax_number: null,
			tax_regime: null,
			vat_rate: null,
			currency: "FCFA",
			quote_prefix: "DEV-",
			invoice_prefix: "FAC-",
			receipt_prefix: "REC-",
			decimals: 0,
			date_format: "dd/MM/yyyy",
			logo_url: null,
			signature_url: null,
			stamp_url: null
		}).eq("id", settingsId);
		if (error) return toast.error(error.message);
		try {
			await saveAiSettings({ data: {
				openai_key: null,
				gemini_key: null,
				claude_key: null,
				ai_model: null
			} });
		} catch (e) {
			toast.error(e.message);
		}
		refetch();
		toast.success("Paramètres réinitialisés");
	};
	const backup = () => {
		exportCfg();
		toast.success("Sauvegarde créée");
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
		className: "rounded-2xl border border-border bg-card shadow-sm p-5",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-semibold text-sm mb-3",
				children: "Actions rapides"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 gap-2",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						size: "sm",
						className: "justify-start gap-2",
						onClick: exportCfg,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Download, { className: "h-4 w-4" }), " Exporter la configuration"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						size: "sm",
						className: "justify-start gap-2",
						onClick: () => fileInput.current?.click(),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Upload, { className: "h-4 w-4" }), " Importer une configuration"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						size: "sm",
						className: "justify-start gap-2",
						onClick: backup,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DatabaseBackup, { className: "h-4 w-4" }), " Créer une sauvegarde"]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
						variant: "outline",
						size: "sm",
						className: "justify-start gap-2 text-destructive hover:text-destructive",
						onClick: reset,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(RotateCcw, { className: "h-4 w-4" }), " Réinitialiser les paramètres"]
					})
				]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
				ref: fileInput,
				type: "file",
				accept: "application/json",
				className: "hidden",
				onChange: (e) => {
					const f = e.target.files?.[0];
					if (f) importCfg(f);
					e.target.value = "";
				}
			})
		]
	});
}
//#endregion
export { ParametresPage as component };

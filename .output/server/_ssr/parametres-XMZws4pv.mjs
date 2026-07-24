import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { L as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { D as Save, H as Mail, K as LoaderCircle, M as Phone, N as Percent, O as RotateCcw, V as MapPin, X as Image, Y as KeyRound, a as Users, bt as Building2, c as Upload, ct as DatabaseBackup, et as Globe, f as Trash2, k as Receipt, mt as CircleAlert, nt as FilePenLine, pt as CircleCheck, st as Download, tt as FileText, x as Shield } from "../_libs/lucide-react.mjs";
import { t as supabase } from "./client-BJMeE8ke.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { n as useSignedUrl } from "./use-company-settings-cUrAb-P6.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { t as Button } from "./button-BLZ6ednA.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as AppShell } from "./AppShell-DPS6HqUC.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-C0WYWEQX.mjs";
import { t as Input } from "./input-RZh3g2iG.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { n as objectType, r as stringType } from "../_libs/zod.mjs";
import { c as createServerFn } from "./createServerFn-CIHAFgYl.mjs";
import { i as TabsTrigger, n as TabsContent, r as TabsList, t as Tabs } from "./tabs-CCJRliUM.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { t as Badge } from "./badge-D1Dupn2y.mjs";
import { n as createSsrRpc, t as UserManagement } from "./UserManagementTable-CUurC1jP.mjs";
import { t as Root } from "../_libs/radix-ui__react-separator.mjs";
import { n as SwitchThumb, t as Switch$1 } from "../_libs/radix-ui__react-switch.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/parametres-XMZws4pv.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Textarea = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Textarea.displayName = "Textarea";
var Separator = import_react.forwardRef(({ className, orientation = "horizontal", decorative = true, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Root, {
	ref,
	decorative,
	orientation,
	className: cn("shrink-0 bg-border", orientation === "horizontal" ? "h-[1px] w-full" : "h-full w-[1px]", className),
	...props
}));
Separator.displayName = Root.displayName;
var Switch = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch$1, {
	className: cn("peer inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input", className),
	...props,
	ref,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SwitchThumb, { className: cn("pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-4 data-[state=unchecked]:translate-x-0") })
}));
Switch.displayName = Switch$1.displayName;
var MODULE_MAP = {
	"Dashboard": "dashboard.view",
	"Ventes": "ventes.view",
	"Devis": "ventes.view",
	"Clients": "clients.view",
	"Produits & Services": "ventes.view",
	"Achats": "achats.view",
	"Fournisseurs": "achats.view",
	"Dépenses": "ventes.view",
	"Rapports": "ventes.view",
	"Assistant IA": "assistant.use",
	"Paramètres": "settings.manage"
};
var ACTION_MAP = {
	"Voir": "view",
	"Créer": "create",
	"Modifier": "edit",
	"Supprimer": "delete",
	"Export PDF": "export",
	"Export Excel": "export",
	"Encaisser": "process"
};
function PermissionsTab() {
	const qc = useQueryClient();
	const { data: roles, isLoading: rolesLoading } = useQuery({
		queryKey: ["roles"],
		queryFn: async () => {
			const { data, error } = await supabase.from("roles").select("*, role_permissions(permission_id, permissions(code))");
			if (error) throw error;
			return data;
		}
	});
	const { data: allPermissions, isLoading: permsLoading } = useQuery({
		queryKey: ["permissions"],
		queryFn: async () => {
			const { data, error } = await supabase.from("permissions").select("*");
			if (error) throw error;
			return data;
		}
	});
	const safePermissions = (0, import_react.useMemo)(() => Array.isArray(allPermissions) ? allPermissions : [], [allPermissions]);
	const [permissionsState, setPermissionsState] = (0, import_react.useState)({});
	const [initialized, setInitialized] = (0, import_react.useState)(false);
	(0, import_react.useMemo)(() => {
		if (roles && safePermissions.length > 0 && !initialized) {
			const newState = {};
			roles.forEach((role) => {
				newState[role.id] = {};
				safePermissions.forEach((perm) => {
					newState[role.id][perm.id] = role.role_permissions.some((rp) => rp.permission_id === perm.id);
				});
			});
			setPermissionsState(newState);
			setInitialized(true);
		}
	}, [
		roles,
		safePermissions,
		initialized
	]);
	const savePermissions = useMutation({
		mutationFn: async () => {
			for (const roleId in permissionsState) for (const permId in permissionsState[roleId]) {
				const isEnabled = permissionsState[roleId][permId];
				const currentEnabled = (roles?.find((r) => r.id === roleId))?.role_permissions.some((rp) => rp.permission_id === permId);
				if (isEnabled && !currentEnabled) {
					const { error } = await supabase.from("role_permissions").insert({
						role_id: roleId,
						permission_id: permId
					});
					if (error) throw error;
				} else if (!isEnabled && currentEnabled) {
					const { error } = await supabase.from("role_permissions").delete().eq("role_id", roleId).eq("permission_id", permId);
					if (error) throw error;
				}
			}
		},
		onSuccess: () => {
			toast.success("Permissions enregistrées avec succès.");
			qc.invalidateQueries({ queryKey: ["roles"] });
		},
		onError: (e) => toast.error(e.message)
	});
	if (rolesLoading || permsLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin h-8 w-8 mx-auto my-10" });
	const adminRoleId = roles?.find((r) => r.name === "Administrateur")?.id;
	const togglePermission = (roleId, permId) => {
		setPermissionsState((prev) => ({
			...prev,
			[roleId]: {
				...prev[roleId],
				[permId]: !prev[roleId][permId]
			}
		}));
	};
	const renderTable = (items, type) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "border rounded-xl bg-card shadow-sm mb-6",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "p-4 border-b",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
				className: "font-semibold text-lg",
				children: type === "module" ? "CARTE 1 : Modules" : "CARTE 2 : Actions"
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
			className: "w-[200px]",
			children: type === "module" ? "Module" : "Action"
		}), roles?.map((role) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, {
			className: "text-center",
			children: role.name
		}, role.id))] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableBody, { children: Object.entries(items).map(([label, codeSnippet]) => {
			const perm = safePermissions?.find((p) => p.code.includes(codeSnippet));
			if (!perm) return null;
			return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
				className: "font-medium",
				children: label
			}), roles?.map((role) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
				className: "text-center",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Switch, {
					checked: permissionsState[role.id]?.[perm.id],
					onCheckedChange: () => togglePermission(role.id, perm.id),
					disabled: role.id === adminRoleId
				})
			}, role.id))] }, label);
		}) })] })]
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-6",
		children: [
			renderTable(MODULE_MAP, "module"),
			renderTable(ACTION_MAP, "action"),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "flex justify-end",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => savePermissions.mutate(),
					disabled: savePermissions.isPending,
					className: "gap-2",
					children: [savePermissions.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Save, { className: "h-4 w-4" }), "💾 Enregistrer les permissions"]
				})
			})
		]
	});
}
var changePassword = createServerFn({ method: "POST" }).validator(objectType({ newPassword: stringType().min(8) })).handler(createSsrRpc("3277300f023c38aa5dcfcfb37ca93fc768c14158845530dcb67e506002c5b750"));
var BUCKET = "company-assets";
var MAX_MB = 2;
var ACCEPTED = [
	"image/png",
	"image/jpeg",
	"image/jpg",
	"image/svg+xml"
];
async function getAiSettings() {
	return {};
}
async function saveAiSettings(_) {
	return {};
}
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
									value: "permissions",
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-4 w-4" }),
									children: "Permissions"
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
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "permissions",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(PermissionsTab, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "security",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SecurityTab, {})
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
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserManagement, {});
}
function SecurityTab() {
	const [currentPwd, setCurrentPwd] = (0, import_react.useState)("");
	const [newPwd, setNewPwd] = (0, import_react.useState)("");
	const [confirmPwd, setConfirmPwd] = (0, import_react.useState)("");
	const changing = useMutation({
		mutationFn: async () => {
			if (!currentPwd) throw new Error("Mot de passe actuel requis");
			if (newPwd.length < 8) throw new Error("Le nouveau mot de passe doit contenir au moins 8 caractères.");
			if (newPwd !== confirmPwd) throw new Error("La confirmation ne correspond pas au nouveau mot de passe.");
			const { data: { user } } = await supabase.auth.getUser();
			if (!user || !user.email) throw new Error("Utilisateur non authentifié.");
			const { error: signInError } = await supabase.auth.signInWithPassword({
				email: user.email,
				password: currentPwd
			});
			if (signInError) throw new Error("Mot de passe actuel incorrect.");
			await changePassword({ data: { newPassword: newPwd } });
		},
		onSuccess: () => {
			toast.success("Votre mot de passe a été modifié avec succès.");
			setCurrentPwd("");
			setNewPwd("");
			setConfirmPwd("");
		},
		onError: (e) => toast.error(e.message)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "space-y-6",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
			title: "Mot de passe",
			icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(KeyRound, { className: "h-4 w-4" }),
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "grid grid-cols-1 md:grid-cols-2 gap-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Mot de passe actuel",
						required: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "password",
							value: currentPwd,
							onChange: (e) => setCurrentPwd(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {}),
					" ",
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Nouveau mot de passe",
						required: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "password",
							value: newPwd,
							onChange: (e) => setNewPwd(e.target.value)
						})
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Confirmer le nouveau mot de passe",
						required: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "password",
							value: confirmPwd,
							onChange: (e) => setConfirmPwd(e.target.value)
						})
					})
				]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "mt-4",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => changing.mutate(),
					disabled: changing.isPending || !currentPwd || !newPwd || !confirmPwd,
					children: [changing.isPending && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin mr-2" }), "Changer le mot de passe"]
				})
			})]
		})
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
	const importCfg = async (file) => {
		try {
			const text = await file.text();
			const { id, created_at, updated_at, ...clean } = JSON.parse(text);
			const aiPatch = {};
			const paramPatch = {};
			for (const [key, value] of Object.entries(clean)) if ([
				"openai_key",
				"gemini_key",
				"claude_key",
				"ai_model",
				"ai_temperature",
				"ai_max_tokens",
				"ai_enabled"
			].includes(key)) aiPatch[key] = value;
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

import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { $ as Download, C as RotateCcw, D as Phone, E as Plus, G as Image, H as LoaderCircle, J as FileText, O as Percent, Q as EyeOff, R as MapPin, S as Save, X as FilePenLine, Z as Eye, _ as Shield, at as CircleCheck, d as Trash2, et as DatabaseBackup, ft as Building2, i as Users, lt as ChevronDown, ot as CircleAlert, p as Sparkles, q as Globe, s as Upload, st as ChevronUp, ut as Check, w as Receipt, z as Mail } from "../_libs/lucide-react.mjs";
import { c as createServerFn } from "./createServerFn-CIHAFgYl.mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { t as createSsrRpc } from "./createSsrRpc-DrJiPTK1.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { n as cn, t as Button } from "./button-B2LyfGb_.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { u as useSignedUrl } from "./AssistantContext-BQCUsUwo.mjs";
import { t as AppShell } from "./AppShell-B_T5tO-_.mjs";
import { i as stringType, n as numberType, r as objectType, t as booleanType } from "../_libs/zod.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as Label, t as Input } from "./label-sQVcd-s9.mjs";
import { a as Tabs, c as TabsTrigger, i as DialogTitle, n as DialogContent, o as TabsContent, r as DialogHeader, s as TabsList, t as Dialog } from "./dialog-CZLSvLUy.mjs";
import { a as SelectItemIndicator, c as SelectPortal, d as SelectSeparator$1, f as SelectTrigger$1, i as SelectItem$1, l as SelectScrollDownButton$1, m as SelectViewport, n as SelectContent$1, o as SelectItemText, p as SelectValue$1, r as SelectIcon, s as SelectLabel$1, t as Select$1, u as SelectScrollUpButton$1 } from "../_libs/@radix-ui/react-select+[...].mjs";
import { t as Root } from "../_libs/radix-ui__react-separator.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/parametres-C32TPy7w.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var Select = Select$1;
var SelectValue = SelectValue$1;
var SelectTrigger = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectTrigger$1, {
	ref,
	className: cn("flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background cursor-pointer data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1", className),
	...props,
	children: [children, /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectIcon, {
		asChild: true,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4 opacity-50" })
	})]
}));
SelectTrigger.displayName = SelectTrigger$1.displayName;
var SelectScrollUpButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollUpButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronUp, { className: "h-4 w-4" })
}));
SelectScrollUpButton.displayName = SelectScrollUpButton$1.displayName;
var SelectScrollDownButton = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollDownButton$1, {
	ref,
	className: cn("flex cursor-default items-center justify-center py-1", className),
	...props,
	children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChevronDown, { className: "h-4 w-4" })
}));
SelectScrollDownButton.displayName = SelectScrollDownButton$1.displayName;
var SelectContent = import_react.forwardRef(({ className, children, position = "popper", ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectPortal, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent$1, {
	ref,
	className: cn("relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-(--radix-select-content-transform-origin)", position === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1", className),
	position,
	...props,
	children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollUpButton, {}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectViewport, {
			className: cn("p-1", position === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]"),
			children
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectScrollDownButton, {})
	]
}) }));
SelectContent.displayName = SelectContent$1.displayName;
var SelectLabel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectLabel$1, {
	ref,
	className: cn("px-2 py-1.5 text-sm font-semibold", className),
	...props
}));
SelectLabel.displayName = SelectLabel$1.displayName;
var SelectItem = import_react.forwardRef(({ className, children, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectItem$1, {
	ref,
	className: cn("relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50", className),
	...props,
	children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: "absolute right-2 flex h-3.5 w-3.5 items-center justify-center",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemIndicator, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Check, { className: "h-4 w-4" }) })
	}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItemText, { children })]
}));
SelectItem.displayName = SelectItem$1.displayName;
var SelectSeparator = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectSeparator$1, {
	ref,
	className: cn("-mx-1 my-1 h-px bg-muted", className),
	...props
}));
SelectSeparator.displayName = SelectSeparator$1.displayName;
var Textarea = import_react.forwardRef(({ className, ...props }, ref) => {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
		className: cn("flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm", className),
		ref,
		...props
	});
});
Textarea.displayName = "Textarea";
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
var createUser = createServerFn({ method: "POST" }).validator(objectType({
	email: stringType().email(),
	password: stringType().min(8),
	role_id: stringType().uuid(),
	full_name: stringType().optional()
})).handler(createSsrRpc("295aa6590b3d0b6eff2323a03f201d8130d8d7c4275b92dbc4fc1a03b88398af"));
var updateUser = createServerFn({ method: "POST" }).validator(objectType({
	id: stringType().uuid(),
	role_id: stringType().uuid().optional(),
	status: stringType().optional(),
	full_name: stringType().optional()
})).handler(createSsrRpc("07ec6017f54e88f2d9e8a23657c08348ba3115eb7bc51a0f5d490cbbdaab284d"));
createServerFn({ method: "POST" }).validator(objectType({ id: stringType().uuid() })).handler(createSsrRpc("935cb59acf6390e8d25869011e530a73894912a783162c901805416f0611b9b2"));
createServerFn({ method: "POST" }).validator(objectType({
	id: stringType().uuid(),
	password: stringType().min(8)
})).handler(createSsrRpc("d28a82b9f282415fc39d3d0e19f94414237137ca65aa3a3dfe28d898cfc29b77"));
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
	const { data, isLoading, error } = useQuery({
		queryKey: ["parametres"],
		queryFn: async () => {
			const [{ data: params, error }, aiSettings] = await Promise.all([supabase.from("parametres").select("*").limit(1).maybeSingle(), getAiSettings()]);
			if (error) throw error;
			if (!params) {
				const { data: newParams, error: createError } = await supabase.from("parametres").insert({
					company_name: "Maguy Multi Services",
					currency: "FCFA"
				}).select().single();
				if (createError) throw createError;
				return {
					...newParams,
					...aiSettings
				};
			}
			return {
				...params,
				...aiSettings
			};
		}
	});
	if (error) {
		console.error("Error loading parametres:", error);
		toast.error("Erreur lors du chargement des paramètres");
	}
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
	const usersStats = useQuery({
		queryKey: ["auth-user"],
		queryFn: async () => {
			const { data } = await supabase.auth.getUser();
			return {
				current: data.user,
				total: data.user ? 1 : 0,
				admins: 1,
				employees: 0
			};
		}
	});
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
									value: "roles",
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4" }),
									children: "Rôles"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabTrig, {
									value: "security",
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4" }),
									children: "Sécurité"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabTrig, {
									value: "ai",
									icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4" }),
									children: "Assistant IA"
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
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsersTab, { stats: usersStats.data })
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "roles",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(RolesTab, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "security",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SecurityTab, {})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabsContent, {
							value: "ai",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AiTab, {
								form,
								update
							})
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
	const qc = useQueryClient();
	const { data: users, isLoading } = useQuery({
		queryKey: ["users"],
		queryFn: async () => {
			const { data, error } = await supabase.from("profiles").select("*, roles(name, id)").order("created_at");
			if (error) throw error;
			return data;
		}
	});
	const [isOpen, setIsOpen] = (0, import_react.useState)(false);
	const [editingUser, setEditingUser] = (0, import_react.useState)(null);
	const { data: roles } = useQuery({
		queryKey: ["roles"],
		queryFn: async () => {
			const { data, error } = await supabase.from("roles").select("*");
			if (error) throw error;
			return data;
		}
	});
	const saveUser = useMutation({
		mutationFn: async (data) => {
			if (editingUser) await updateUser({
				id: editingUser.id,
				...data
			});
			else await createUser({
				email: data.email,
				password: data.password,
				role_id: data.role_id,
				full_name: data.full_name
			});
		},
		onSuccess: () => {
			toast.success("Utilisateur enregistré");
			setIsOpen(false);
			qc.invalidateQueries({ queryKey: ["users"] });
		},
		onError: (e) => toast.error(e.message)
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Card, {
		title: "Gestion des utilisateurs",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Users, { className: "h-4 w-4" }),
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-between items-center mb-6",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
					className: "text-sm font-medium",
					children: "Liste des utilisateurs"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
					onClick: () => {
						setEditingUser(null);
						setIsOpen(true);
					},
					size: "sm",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "h-4 w-4 mr-2" }), " Ajouter"]
				})]
			}),
			isLoading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "text-center p-4",
				children: "Chargement..."
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "space-y-2",
				children: users?.map((user) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center justify-between p-3 border rounded-lg",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "font-medium",
						children: user.full_name || "Sans nom"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "text-xs text-muted-foreground",
						children: [
							user.roles?.name,
							" • ",
							user.status
						]
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
						className: "flex gap-2",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "sm",
							onClick: () => {
								setEditingUser(user);
								setIsOpen(true);
							},
							children: "Modifier"
						})
					})]
				}, user.id))
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Dialog, {
				open: isOpen,
				onOpenChange: setIsOpen,
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, { children: editingUser ? "Modifier l'utilisateur" : "Ajouter un utilisateur" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: (e) => {
						e.preventDefault();
						const formData = new FormData(e.currentTarget);
						saveUser.mutate(Object.fromEntries(formData));
					},
					className: "space-y-4",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Nom complet",
							required: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								name: "full_name",
								defaultValue: editingUser?.full_name,
								required: true
							})
						}),
						!editingUser && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Email",
							required: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								name: "email",
								type: "email",
								required: true
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Mot de passe",
							required: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
								name: "password",
								type: "password",
								required: true
							})
						})] }),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
							label: "Rôle",
							required: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
								name: "role_id",
								defaultValue: editingUser?.role_id,
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Sélectionner un rôle" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: roles?.map((role) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
									value: role.id,
									children: role.name
								}, role.id)) })]
							})
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							disabled: saveUser.isPending,
							children: saveUser.isPending ? "Enregistrement..." : "Enregistrer"
						})
					]
				})] })
			})
		]
	});
}
function RolesTab() {
	const qc = useQueryClient();
	const { data: roles, isLoading } = useQuery({
		queryKey: ["roles"],
		queryFn: async () => {
			const { data, error } = await supabase.from("roles").select("*, role_permissions(permission_id)");
			if (error) throw error;
			return data;
		}
	});
	const { data: permissions } = useQuery({
		queryKey: ["permissions"],
		queryFn: async () => {
			const { data, error } = await supabase.from("permissions").select("*");
			if (error) throw error;
			return data;
		}
	});
	const togglePermission = useMutation({
		mutationFn: async ({ roleId, permId, active }) => {
			if (active) await supabase.from("role_permissions").insert({
				role_id: roleId,
				permission_id: permId
			});
			else await supabase.from("role_permissions").delete().eq("role_id", roleId).eq("permission_id", permId);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] })
	});
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { children: "Chargement..." });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		title: "Gestion des Rôles",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Shield, { className: "h-4 w-4" }),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "space-y-4",
			children: roles?.map((role) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "p-4 border rounded-lg",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h4", {
					className: "font-medium",
					children: role.name
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-2 md:grid-cols-3 gap-2 mt-2",
					children: permissions?.map((perm) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex items-center space-x-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
							type: "checkbox",
							checked: role.role_permissions.some((rp) => rp.permission_id === perm.id),
							onChange: (e) => togglePermission.mutate({
								roleId: role.id,
								permId: perm.id,
								active: e.target.checked
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: perm.code })]
					}, perm.id))
				})]
			}, role.id))
		})
	});
}
function AiTab({ form, update }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Card, {
		title: "Assistant IA",
		description: "Clés API et modèle par défaut.",
		icon: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sparkles, { className: "h-4 w-4" }),
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "grid grid-cols-1 gap-4",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
					label: "Modèle IA par défaut",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
						value: form.ai_model ?? void 0,
						onValueChange: (v) => update("ai_model", v),
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Choisir un modèle…" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "GPT",
								children: "GPT (OpenAI)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "Gemini",
								children: "Gemini (Google)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "Claude",
								children: "Claude (Anthropic)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "Qwen",
								children: "Qwen (Alibaba)"
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
								value: "DeepSeek",
								children: "DeepSeek"
							})
						] })]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SecretField, {
					label: "Clé OpenAI",
					value: form.openai_key ?? "",
					onChange: (v) => update("openai_key", v || null)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SecretField, {
					label: "Clé Gemini",
					value: form.gemini_key ?? "",
					onChange: (v) => update("gemini_key", v || null)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SecretField, {
					label: "Clé Claude",
					value: form.claude_key ?? "",
					onChange: (v) => update("claude_key", v || null)
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "grid grid-cols-2 gap-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Température",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							step: "0.1",
							min: "0",
							max: "1",
							value: form.ai_temperature ?? .7,
							onChange: (e) => update("ai_temperature", parseFloat(e.target.value))
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
						label: "Max Tokens",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "number",
							min: "1",
							max: "8192",
							value: form.ai_max_tokens ?? 2048,
							onChange: (e) => update("ai_max_tokens", parseInt(e.target.value))
						})
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex items-center space-x-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
						type: "checkbox",
						id: "ai-enabled",
						checked: form.ai_enabled ?? true,
						onChange: (e) => update("ai_enabled", e.target.checked),
						className: "h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
						htmlFor: "ai-enabled",
						className: "text-sm",
						children: "Activer l'assistant IA"
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex flex-wrap gap-2 pt-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						variant: "outline",
						onClick: () => toast.success("Configuration IA prête à être testée"),
						children: "Tester la connexion"
					})
				})
			]
		})
	});
}
function SecretField({ label, value, onChange }) {
	const [shown, setShown] = (0, import_react.useState)(false);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Field, {
		label,
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
				type: shown ? "text" : "password",
				value,
				onChange: (e) => onChange(e.target.value),
				placeholder: "sk-…",
				autoComplete: "off"
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
				type: "button",
				onClick: () => setShown((s) => !s),
				className: "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-muted-foreground hover:bg-muted",
				children: shown ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-3.5 w-3.5" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-3.5 w-3.5" })
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

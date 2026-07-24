import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { L as require_jsx_runtime, a as Overlay2, c as Title2, i as Description2, n as Cancel, o as Portal2, r as Content2, s as Root2, t as Action } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { J as Key, K as LoaderCircle, P as Pencil, at as EyeOff, f as Trash2, it as Eye, j as Plus, m as ToggleLeft, o as User, ot as Ellipsis, p as ToggleRight } from "../_libs/lucide-react.mjs";
import { t as logAction } from "./audit.server-AsKiprSl.mjs";
import { t as supabase } from "./client-BN74eToN.mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { t as usePermissions } from "./use-permissions-Bk8eXqHd.mjs";
import { t as cn } from "./utils-C_uf36nf.mjs";
import { n as buttonVariants, t as Button } from "./button-BLZ6ednA.mjs";
import { n as DropdownMenuContent, o as DropdownMenuTrigger, r as DropdownMenuItem, t as DropdownMenu } from "./dropdown-menu-BtjXROHi.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as DialogHeader, i as DialogFooter, n as DialogContent, o as DialogTitle, s as DialogTrigger, t as Dialog } from "./dialog-DIo89e4g.mjs";
import { t as useActionPermission } from "./use-action-permission-hyj0Yfm0.mjs";
import { a as TableHeader, i as TableHead, n as TableBody, o as TableRow, r as TableCell, t as Table } from "./table-C0WYWEQX.mjs";
import { t as Input } from "./input-gBPzjYQc.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { n as objectType, r as stringType, t as enumType } from "../_libs/zod.mjs";
import { c as createServerFn, i as TSS_SERVER_FUNCTION } from "./createServerFn-CIHAFgYl.mjs";
import { a as SelectValue, i as SelectTrigger, n as SelectContent, r as SelectItem, t as Select } from "./select-Dg1urBTx.mjs";
import { t as getServerFnById } from "../__23tanstack-start-server-fn-resolver-UrTpwkEB.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/UserManagementTable-xGtlArGe.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
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
var deleteUser = createServerFn({ method: "POST" }).validator(objectType({ id: stringType().uuid() })).handler(createSsrRpc("935cb59acf6390e8d25869011e530a73894912a783162c901805416f0611b9b2"));
var createUser = createServerFn({ method: "POST" }).validator(objectType({
	email: stringType().email(),
	password: stringType().min(6),
	role_id: stringType().uuid(),
	full_name: stringType(),
	username: stringType(),
	phone: stringType().optional(),
	status: enumType(["actif", "suspendu"])
})).handler(createSsrRpc("295aa6590b3d0b6eff2323a03f201d8130d8d7c4275b92dbc4fc1a03b88398af"));
var updateUser = createServerFn({ method: "POST" }).validator(objectType({
	id: stringType().uuid(),
	role_id: stringType().uuid().optional(),
	status: enumType(["actif", "suspendu"]).optional(),
	full_name: stringType().optional(),
	username: stringType().optional(),
	phone: stringType().optional()
})).handler(createSsrRpc("07ec6017f54e88f2d9e8a23657c08348ba3115eb7bc51a0f5d490cbbdaab284d"));
var toggleStatus = createServerFn({ method: "POST" }).validator(objectType({
	id: stringType().uuid(),
	status: enumType(["actif", "suspendu"])
})).handler(createSsrRpc("9b9e6940e1ba401dc272ccc95a359e8297bb36788bf078f53ed788d2fad8ed2a"));
var resetUserPassword = createServerFn({ method: "POST" }).validator(objectType({ id: stringType().uuid() })).handler(createSsrRpc("d28a82b9f282415fc39d3d0e19f94414237137ca65aa3a3dfe28d898cfc29b77"));
function UserFormDialog({ user }) {
	const [open, setOpen] = (0, import_react.useState)(false);
	const [showPassword, setShowPassword] = (0, import_react.useState)(false);
	const isEdit = !!user;
	const [formData, setFormData] = (0, import_react.useState)({
		email: user?.username || "",
		password: "",
		confirmPassword: "",
		role_id: (user?.roles)?.id || "",
		full_name: user?.full_name || "",
		username: user?.username || "",
		phone: user?.phone || "",
		status: user?.status || "actif"
	});
	(0, import_react.useEffect)(() => {
		if (user) setFormData({
			email: user.username || "",
			password: "",
			confirmPassword: "",
			role_id: user.roles?.id || "",
			full_name: user.full_name || "",
			username: user.username || "",
			phone: user.phone || "",
			status: user.status || "actif"
		});
	}, [user]);
	const qc = useQueryClient();
	const { data: roles } = useQuery({
		queryKey: ["roles"],
		queryFn: async () => {
			const { data, error } = await supabase.from("roles").select("id, name");
			if (error) throw error;
			return data;
		}
	});
	const createMutation = useMutation({
		mutationFn: createUser,
		onSuccess: () => {
			toast.success("Utilisateur créé");
			setOpen(false);
			qc.invalidateQueries({ queryKey: ["users"] });
			setFormData({
				email: "",
				password: "",
				confirmPassword: "",
				role_id: "",
				full_name: "",
				username: "",
				phone: "",
				status: "actif"
			});
		},
		onError: (error) => {
			toast.error(error.message || "Une erreur est survenue");
		}
	});
	const updateMutation = useMutation({
		mutationFn: updateUser,
		onSuccess: () => {
			toast.success("Utilisateur mis à jour");
			setOpen(false);
			qc.invalidateQueries({ queryKey: ["users"] });
		},
		onError: (error) => {
			toast.error(error.message || "Une erreur est survenue");
		}
	});
	const mutation = isEdit ? updateMutation : createMutation;
	const handleSubmit = (e) => {
		e.preventDefault();
		if (mutation.isPending) return;
		if (!isEdit && formData.password !== formData.confirmPassword) {
			toast.error("Les mots de passe ne correspondent pas");
			return;
		}
		if (isEdit) {
			const payload = {
				id: user.id,
				role_id: formData.role_id,
				status: formData.status,
				full_name: formData.full_name,
				username: formData.username,
				phone: formData.phone
			};
			updateMutation.mutate({ data: payload });
		} else {
			const payload = {
				email: formData.email,
				password: formData.password,
				role_id: formData.role_id,
				full_name: formData.full_name,
				username: formData.username,
				phone: formData.phone,
				status: formData.status
			};
			createMutation.mutate({ data: payload });
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Dialog, {
		open,
		onOpenChange: setOpen,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTrigger, {
			asChild: true,
			children: isEdit ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("button", {
				className: "flex w-full items-center px-2 py-1.5 text-sm outline-none hover:bg-slate-100",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Pencil, { className: "mr-2 h-4 w-4" }), " Modifier"]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
				className: "bg-[#2563EB] hover:bg-[#1D4ED8]",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Plus, { className: "mr-2 h-4 w-4" }), " Nouvel utilisateur"]
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
			className: "max-w-[760px] p-0 overflow-hidden rounded-[18px] shadow-2xl",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogHeader, {
				className: "p-6 pb-2 bg-[#F8FAFC]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "flex justify-between items-start",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "flex gap-4 items-center",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "p-3 bg-[#E0E7FF] rounded-full text-[#2563EB]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(User, { className: "h-6 w-6" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
							className: "text-xl",
							children: isEdit ? "Modifier l'utilisateur" : "Nouvel utilisateur"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-sm text-gray-500",
							children: isEdit ? "Modifiez les informations du collaborateur." : "Créez un nouveau compte collaborateur et attribuez immédiatement ses permissions."
						})] })]
					})
				})
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: handleSubmit,
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "p-6 grid grid-cols-2 gap-6",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Nom complet" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									placeholder: "Ex : Ali Traoré",
									value: formData.full_name,
									onChange: (e) => setFormData({
										...formData,
										full_name: e.target.value
									}),
									required: true,
									disabled: mutation.isPending
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Nom d'utilisateur" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									placeholder: "Ex : ali.traore",
									value: formData.username,
									onChange: (e) => setFormData({
										...formData,
										username: e.target.value
									}),
									required: true,
									disabled: mutation.isPending
								})]
							}),
							!isEdit && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: "email",
									placeholder: "Ex : ali@entreprise.ci",
									value: formData.email,
									onChange: (e) => setFormData({
										...formData,
										email: e.target.value
									}),
									required: true,
									disabled: mutation.isPending
								})]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Téléphone" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									placeholder: "Ex : 07 58 48 37 26",
									value: formData.phone,
									onChange: (e) => setFormData({
										...formData,
										phone: e.target.value
									}),
									disabled: mutation.isPending
								})]
							})
						]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Rôle" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: formData.role_id,
									onValueChange: (value) => setFormData({
										...formData,
										role_id: value
									}),
									required: true,
									disabled: mutation.isPending,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, { placeholder: "Sélectionner un rôle" }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectContent, { children: roles?.map((role) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: role.id,
										children: role.name
									}, role.id)) })]
								})]
							}),
							!isEdit && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Mot de passe" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										type: showPassword ? "text" : "password",
										placeholder: "••••••••",
										value: formData.password,
										onChange: (e) => setFormData({
											...formData,
											password: e.target.value
										}),
										required: true,
										disabled: mutation.isPending
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
										type: "button",
										className: "absolute right-3 top-2.5 text-gray-400",
										onClick: () => setShowPassword(!showPassword),
										children: showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" })
									})]
								})]
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Confirmation" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
									type: showPassword ? "text" : "password",
									placeholder: "••••••••",
									value: formData.confirmPassword,
									onChange: (e) => setFormData({
										...formData,
										confirmPassword: e.target.value
									}),
									required: true,
									disabled: mutation.isPending
								})]
							})] }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Statut" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Select, {
									value: formData.status,
									onValueChange: (value) => setFormData({
										...formData,
										status: value
									}),
									required: true,
									disabled: mutation.isPending,
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectTrigger, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectValue, {}) }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(SelectContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "actif",
										children: "● Actif"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SelectItem, {
										value: "suspendu",
										children: "● Désactivé"
									})] })]
								})]
							})
						]
					})]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogFooter, {
					className: "p-6 bg-[#F8FAFC] border-t",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "outline",
						onClick: () => setOpen(false),
						disabled: mutation.isPending,
						children: "Annuler"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "submit",
						className: "bg-[#2563EB] hover:bg-[#1D4ED8]",
						disabled: mutation.isPending,
						children: mutation.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "mr-2 h-4 w-4 animate-spin" }),
							" ",
							isEdit ? "Enregistrement..." : "Création..."
						] }) : isEdit ? "Enregistrer les modifications" : "+ Créer l'utilisateur"
					})]
				})]
			})]
		})]
	});
}
var AlertDialog = Root2;
var AlertDialogPortal = Portal2;
var AlertDialogOverlay = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Overlay2, {
	className: cn("fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0", className),
	...props,
	ref
}));
AlertDialogOverlay.displayName = Overlay2.displayName;
var AlertDialogContent = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogOverlay, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Content2, {
	ref,
	className: cn("fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 sm:rounded-lg", className),
	...props
})] }));
AlertDialogContent.displayName = Content2.displayName;
var AlertDialogHeader = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col space-y-2 text-center sm:text-left", className),
	...props
});
AlertDialogHeader.displayName = "AlertDialogHeader";
var AlertDialogFooter = ({ className, ...props }) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
	className: cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className),
	...props
});
AlertDialogFooter.displayName = "AlertDialogFooter";
var AlertDialogTitle = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Title2, {
	ref,
	className: cn("text-lg font-semibold", className),
	...props
}));
AlertDialogTitle.displayName = Title2.displayName;
var AlertDialogDescription = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Description2, {
	ref,
	className: cn("text-sm text-muted-foreground", className),
	...props
}));
AlertDialogDescription.displayName = Description2.displayName;
var AlertDialogAction = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Action, {
	ref,
	className: cn(buttonVariants(), className),
	...props
}));
AlertDialogAction.displayName = Action.displayName;
var AlertDialogCancel = import_react.forwardRef(({ className, ...props }, ref) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Cancel, {
	ref,
	className: cn(buttonVariants({ variant: "outline" }), "mt-2 sm:mt-0", className),
	...props
}));
AlertDialogCancel.displayName = Cancel.displayName;
function UserManagement() {
	const qc = useQueryClient();
	const [userToDelete, setUserToDelete] = (0, import_react.useState)(null);
	const [userToDeleteName, setUserToDeleteName] = (0, import_react.useState)(null);
	const { data: userData } = useQuery({
		queryKey: ["user"],
		queryFn: () => supabase.auth.getUser()
	});
	const { roleId } = usePermissions().data || { roleId: null };
	const userId = userData?.data?.user?.id;
	const canDeleteUser = useActionPermission("users.delete");
	const { data: users, isLoading } = useQuery({
		queryKey: ["users"],
		queryFn: async () => {
			const { data, error } = await supabase.from("profiles").select(`
          id, username, full_name, email, phone, status, last_login_at, created_at,
          roles(id, name)
        `);
			if (error) throw error;
			return data;
		}
	});
	const deleteMutation = useMutation({
		mutationFn: deleteUser,
		onSuccess: async (_, variables) => {
			if (userId && userToDeleteName) await logAction(userId, roleId, "delete", "users", { user_name: userToDeleteName });
			qc.invalidateQueries({ queryKey: ["users"] });
			toast.success("Utilisateur supprimé");
			setUserToDelete(null);
			setUserToDeleteName(null);
		},
		onError: (error) => {
			toast.error(error.message || "Erreur lors de la suppression");
		}
	});
	const toggleMutation = useMutation({
		mutationFn: toggleStatus,
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["users"] });
			toast.success("Statut mis à jour");
		},
		onError: (error) => {
			toast.error(error.message || "Erreur lors de la mise à jour");
		}
	});
	const passwordMutation = useMutation({
		mutationFn: resetUserPassword,
		onSuccess: () => {
			toast.success("Un email de réinitialisation a été envoyé.");
		},
		onError: (error) => {
			toast.error(error.message || "Erreur lors de la réinitialisation");
		}
	});
	if (isLoading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex justify-center p-10",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "animate-spin h-8 w-8" })
	});
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "space-y-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "flex justify-between items-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
					className: "text-xl font-semibold",
					children: "Utilisateurs"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserFormDialog, {})]
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "border rounded-lg",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Table, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHeader, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Nom" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Email" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Rôle" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Statut" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableHead, { children: "Actions" })
				] }) }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableBody, { children: users?.map((user) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(TableRow, { children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: user.full_name }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: user.email }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: user.roles?.name }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, {
						className: "capitalize",
						children: user.status === "suspendu" ? "Inactif" : user.status
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TableCell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenu, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DropdownMenuTrigger, {
						asChild: true,
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							variant: "ghost",
							size: "icon",
							disabled: toggleMutation.isPending || passwordMutation.isPending || deleteMutation.isPending,
							children: toggleMutation.isPending || passwordMutation.isPending || deleteMutation.isPending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ellipsis, { className: "h-4 w-4" })
						})
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuContent, {
						align: "end",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserFormDialog, { user }),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
								onClick: () => passwordMutation.mutate({ data: { id: user.id } }),
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Key, { className: "mr-2 h-4 w-4" }), " Réinitialiser le mot de passe"]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
								onClick: () => toggleMutation.mutate({ data: {
									id: user.id,
									status: user.status === "actif" ? "suspendu" : "actif"
								} }),
								children: [user.status === "actif" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleLeft, { className: "mr-2 h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ToggleRight, { className: "mr-2 h-4 w-4" }), user.status === "actif" ? "Désactiver" : "Activer"]
							}),
							canDeleteUser && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DropdownMenuItem, {
								className: "text-destructive",
								onClick: () => {
									setUserToDelete(user.id);
									setUserToDeleteName(user.full_name);
								},
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Trash2, { className: "mr-2 h-4 w-4" }), " Supprimer"]
							})
						]
					})] }) })
				] }, user.id)) })] })
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialog, {
				open: !!userToDelete,
				onOpenChange: () => {
					setUserToDelete(null);
					setUserToDeleteName(null);
				},
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogContent, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogHeader, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogTitle, { children: "Êtes-vous sûr ?" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogDescription, { children: "Cette action est irréversible. L'utilisateur sera supprimé de l'authentification et de la base de données." })] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(AlertDialogFooter, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogCancel, { children: "Annuler" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AlertDialogAction, {
					className: "bg-destructive hover:bg-destructive/90",
					onClick: () => userToDelete && deleteMutation.mutate({ data: { id: userToDelete } }),
					children: "Supprimer"
				})] })] })
			})
		]
	});
}
//#endregion
export { createSsrRpc as n, UserManagement as t };

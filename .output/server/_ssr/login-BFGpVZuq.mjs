import { a as __toESM } from "../_runtime.mjs";
import { n as useForm, t as u } from "../_libs/@hookform/resolvers+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { s as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { B as Lock, H as LayoutDashboard, L as Mail, V as LoaderCircle, tt as Cloud, ut as ChartColumn, v as ShieldCheck } from "../_libs/lucide-react.mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { t as Button } from "./button-DRsC1qZi.mjs";
import { t as motion } from "../_libs/framer-motion.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { i as stringType, r as objectType } from "../_libs/zod.mjs";
import { n as Label, t as Input } from "./label-CmIE8x5o.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-BFGpVZuq.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var loginSchema = objectType({
	email: stringType().email("Adresse e-mail invalide"),
	password: stringType().min(8, "Le mot de passe doit contenir au moins 8 caractères")
});
function LoginPage() {
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [loadingGoogle, setLoadingGoogle] = (0, import_react.useState)(false);
	const navigate = useNavigate();
	const { register, handleSubmit, formState: { errors } } = useForm({ resolver: u(loginSchema) });
	const handleLogin = async (values) => {
		setLoading(true);
		try {
			const { error } = await supabase.auth.signInWithPassword({
				email: values.email,
				password: values.password
			});
			if (error) throw error;
			navigate({ to: "/" });
		} catch (err) {
			toast.error(err.message || "Une erreur est survenue");
		} finally {
			setLoading(false);
		}
	};
	const handleGoogleLogin = async () => {
		setLoadingGoogle(true);
		try {
			const { error } = await supabase.auth.signInWithOAuth({
				provider: "google",
				options: { redirectTo: `${window.location.origin}/` }
			});
			if (error) throw error;
		} catch (err) {
			toast.error(err.message || "Erreur lors de la connexion avec Google");
			setLoadingGoogle(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex min-h-screen bg-slate-50",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "hidden lg:flex w-[45%] bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-blue-900/20 backdrop-blur-sm" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative z-10",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "text-3xl font-bold mb-8",
							children: ["AUREX ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "text-blue-500",
								children: "ERP"
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
							className: "text-4xl font-bold mb-4",
							children: "Gérez votre entreprise avec excellence."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-slate-300 mb-8",
							children: "AUREX ERP centralise vos ventes, achats, clients, fournisseurs, stocks et finances dans une seule plateforme moderne."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "grid grid-cols-2 gap-4",
							children: [
								{
									icon: LayoutDashboard,
									title: "Gestion centralisée",
									description: "Toutes vos données au même endroit."
								},
								{
									icon: ShieldCheck,
									title: "Données sécurisées",
									description: "Sécurité avancée et confidentialité."
								},
								{
									icon: ChartColumn,
									title: "Rapports intelligents",
									description: "Analyses et statistiques en temps réel."
								},
								{
									icon: Cloud,
									title: "Accessible partout",
									description: "Travaillez depuis n'importe où."
								}
							].map((f, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "bg-slate-800/50 p-4 rounded-xl backdrop-blur-md",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(f.icon, { className: "w-6 h-6 text-blue-500 mb-2" }),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-semibold",
										children: f.title
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-slate-400",
										children: f.description
									})
								]
							}, i))
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "relative z-10 text-xs text-slate-500",
					children: "© 2026 AUREX ERP. Tous droits réservés."
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex-1 flex items-center justify-center p-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				initial: {
					opacity: 0,
					y: 20
				},
				animate: {
					opacity: 1,
					y: 0
				},
				className: "w-full max-w-md bg-white p-8 rounded-[20px] shadow-xl border border-slate-100",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mb-8",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-2xl font-bold text-slate-900",
							children: "Bienvenue 👋"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-slate-500",
							children: "Connectez-vous à votre espace sécurisé."
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
						onSubmit: handleSubmit(handleLogin),
						className: "space-y-4",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "email",
										children: "Adresse e-mail"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "relative",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "absolute left-3 top-3 w-4 h-4 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											...register("email"),
											id: "email",
											type: "email",
											className: "pl-10",
											placeholder: "nom@entreprise.com"
										})]
									}),
									errors.email && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-red-500",
										children: errors.email.message
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
								className: "space-y-1.5",
								children: [
									/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "password",
										children: "Mot de passe"
									}),
									/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
										className: "relative",
										children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "absolute left-3 top-3 w-4 h-4 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											...register("password"),
											id: "password",
											type: "password",
											className: "pl-10",
											placeholder: "••••••••"
										})]
									}),
									errors.password && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-xs text-red-500",
										children: errors.password.message
									})
								]
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
								type: "submit",
								className: "w-full bg-blue-600 hover:bg-blue-700 h-10 rounded-lg",
								disabled: loading,
								children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : "Se connecter"
							})
						]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "relative my-6",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "absolute inset-0 flex items-center",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "w-full border-t border-slate-200" })
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "relative flex justify-center text-xs uppercase",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "bg-white px-2 text-slate-500",
								children: "OU"
							})
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						type: "button",
						variant: "outline",
						className: "w-full h-10 rounded-lg",
						onClick: handleGoogleLogin,
						disabled: loadingGoogle,
						children: loadingGoogle ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : "Continuer avec Google"
					})
				]
			})
		})]
	});
}
//#endregion
export { LoginPage as component };

import { a as __toESM } from "../_runtime.mjs";
import { n as useForm, t as u } from "../_libs/@hookform/resolvers+[...].mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { L as require_jsx_runtime } from "../_libs/@radix-ui/react-alert-dialog+[...].mjs";
import { G as Lock, H as Mail, K as LoaderCircle, S as ShieldCheck, at as EyeOff, it as Eye, t as Zap, yt as ChartColumn } from "../_libs/lucide-react.mjs";
import { t as supabase } from "./client-BN74eToN.mjs";
import { t as useCompanySettings } from "./use-company-settings-BK0U8YkZ.mjs";
import { t as motion } from "../_libs/framer-motion.mjs";
import { t as Button } from "./button-BLZ6ednA.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { t as Input } from "./input-gBPzjYQc.mjs";
import { t as Label } from "./label-DBD1bRRP.mjs";
import { n as objectType, r as stringType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-dTicO10A.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var loginSchema = objectType({
	email: stringType().email("Adresse e-mail invalide"),
	password: stringType().min(8, "Le mot de passe doit contenir au moins 8 caractères")
});
function LoginPage() {
	const [loading, setLoading] = (0, import_react.useState)(false);
	const [showPassword, setShowPassword] = (0, import_react.useState)(false);
	const navigate = useNavigate();
	const { companyName, logoUrl } = useCompanySettings();
	const { register, handleSubmit, formState: { errors } } = useForm({ resolver: u(loginSchema) });
	const handleLogin = async (values) => {
		setLoading(true);
		try {
			const { data, error } = await supabase.auth.signInWithPassword({
				email: values.email,
				password: values.password
			});
			if (error) {
				await supabase.rpc("log_connection_attempt", {
					p_email: values.email,
					p_status: "failure"
				});
				throw error;
			}
			await supabase.rpc("log_connection_attempt", {
				p_email: values.email,
				p_status: "success",
				p_user_id: data.user.id
			});
			navigate({ to: "/" });
		} catch (err) {
			toast.error(err.message || "Une erreur est survenue");
		} finally {
			setLoading(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "grid grid-cols-1 md:grid-cols-2 h-[100dvh] w-full bg-slate-50",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-blue-900 to-indigo-900 text-white relative overflow-hidden",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-600/20 via-transparent to-transparent" }),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative z-10",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("h1", {
							className: "text-4xl font-bold tracking-tight mb-6",
							children: [
								"Gérez votre activité avec",
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("br", {}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: "text-blue-400",
									children: "l'excellence opérationnelle"
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-blue-100 text-lg mb-12 max-w-md",
							children: "Une solution ERP complète pour piloter vos achats, ventes, fournisseurs et services avec une intelligence intégrée."
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-8",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "p-3 bg-white/10 rounded-xl",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChartColumn, { className: "h-6 w-6 text-blue-300" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-semibold",
										children: "Rapports en temps réel"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-blue-200",
										children: "Prenez des décisions basées sur des données précises."
									})] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "p-3 bg-white/10 rounded-xl",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ShieldCheck, { className: "h-6 w-6 text-blue-300" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-semibold",
										children: "Sécurité robuste"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-blue-200",
										children: "Protection avancée de vos données métier."
									})] })]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex gap-4",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
										className: "p-3 bg-white/10 rounded-xl",
										children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Zap, { className: "h-6 w-6 text-blue-300" })
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h3", {
										className: "font-semibold",
										children: "Flux optimisés"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
										className: "text-sm text-blue-200",
										children: "Automatisez vos processus pour gagner en productivité."
									})] })]
								})
							]
						})
					]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "relative z-10 text-sm text-blue-300/60",
					children: [
						"© ",
						(/* @__PURE__ */ new Date()).getFullYear(),
						" ",
						companyName || "ERP Premium",
						". Tous droits réservés."
					]
				})
			]
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "flex-1 flex items-center justify-center p-4",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
				initial: {
					opacity: 0,
					scale: .95,
					y: 20
				},
				animate: {
					opacity: 1,
					scale: 1,
					y: 0
				},
				transition: {
					duration: .5,
					ease: "easeOut"
				},
				className: "w-full max-w-[420px] bg-white p-10 rounded-[32px] shadow-xl border border-slate-100",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "flex flex-col items-center mb-10",
					children: [
						logoUrl ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("img", {
							src: logoUrl,
							alt: companyName,
							className: "max-w-[220px] h-auto mb-4 object-contain"
						}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "h-20 w-20 mb-4 bg-blue-600 rounded-3xl flex items-center justify-center text-white font-bold text-3xl shadow-lg",
							children: companyName?.charAt(0) || "E"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
							className: "text-2xl font-bold text-slate-900 tracking-tight",
							children: companyName || "ERP Premium"
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "text-slate-500 text-sm mt-1",
							children: "Connectez-vous à votre espace"
						})
					]
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
					onSubmit: handleSubmit(handleLogin),
					className: "space-y-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
									htmlFor: "email",
									className: "text-xs font-semibold uppercase text-slate-500 tracking-wider",
									children: "Adresse e-mail"
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mail, { className: "absolute left-3 top-3.5 h-4 w-4 text-slate-400" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
										...register("email"),
										id: "email",
										type: "email",
										className: "pl-9 h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-blue-500 transition-colors",
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
							className: "space-y-2",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "flex justify-between items-center",
									children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, {
										htmlFor: "password",
										className: "text-xs font-semibold uppercase text-slate-500 tracking-wider",
										children: "Mot de passe"
									}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("a", {
										href: "#",
										className: "text-xs text-blue-600 hover:underline font-medium",
										children: "Oublié ?"
									})]
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
									className: "relative",
									children: [
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Lock, { className: "absolute left-3 top-3.5 h-4 w-4 text-slate-400" }),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
											...register("password"),
											id: "password",
											type: showPassword ? "text" : "password",
											className: "pl-9 pr-10 h-12 rounded-xl bg-slate-50 border-slate-200 focus:border-blue-500 transition-colors",
											placeholder: "••••••••"
										}),
										/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
											type: "button",
											onClick: () => setShowPassword(!showPassword),
											className: "absolute right-3 top-3.5 text-slate-400 hover:text-slate-600",
											children: showPassword ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(EyeOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Eye, { className: "h-4 w-4" })
										})
									]
								}),
								errors.password && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
									className: "text-xs text-red-500",
									children: errors.password.message
								})
							]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
							type: "submit",
							className: "w-full h-12 rounded-xl text-white font-semibold shadow-md shadow-blue-500/20 bg-blue-600 hover:bg-blue-700 transition-all duration-200 mt-2",
							disabled: loading,
							children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-5 w-5 animate-spin" }) : "Se connecter"
						})
					]
				})]
			})
		})]
	});
}
//#endregion
export { LoginPage as component };

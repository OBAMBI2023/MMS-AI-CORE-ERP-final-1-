import { a as __toESM } from "../_runtime.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { _ as useNavigate } from "../_libs/@tanstack/react-router+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { H as LoaderCircle } from "../_libs/lucide-react.mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { t as Button } from "./button-B2LyfGb_.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { n as Label, t as Input } from "./label-sQVcd-s9.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/login-CsiF-ulB.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function LoginPage() {
	const [email, setEmail] = (0, import_react.useState)("");
	const [password, setPassword] = (0, import_react.useState)("");
	const [loading, setLoading] = (0, import_react.useState)(false);
	const navigate = useNavigate();
	const handleLogin = async (e) => {
		e.preventDefault();
		console.log("DEBUG: handleSubmit initiated");
		setLoading(true);
		try {
			console.log("DEBUG: Attempting signInWithPassword");
			const response = await supabase.auth.signInWithPassword({
				email,
				password
			});
			console.log("DEBUG: Supabase Auth Response:", response);
			const { data, error } = response;
			if (error) {
				console.error("DEBUG: Login Error:", error);
				toast.error(`Erreur de connexion: ${error.message}`);
				return;
			}
			if (data.session) {
				console.log("DEBUG: Login Success. Session created, navigating to /");
				navigate({ to: "/" });
			} else {
				console.error("DEBUG: Login Success but no session returned:", data);
				toast.error("Connexion réussie mais aucune session active. Veuillez contacter l'administrateur.");
			}
		} catch (err) {
			console.error("DEBUG: Unexpected error during login:", err);
			toast.error("Une erreur inattendue est survenue.");
		} finally {
			console.log("DEBUG: handleSubmit finished, setLoading(false)");
			setLoading(false);
		}
	};
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex min-h-screen items-center justify-center bg-background px-4",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "w-full max-w-sm space-y-6",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "text-center",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
					className: "text-2xl font-bold",
					children: "Connexion MMS ERP"
				}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
					className: "text-muted-foreground mt-2",
					children: "Accédez à votre espace sécurisé"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("form", {
				onSubmit: handleLogin,
				className: "space-y-4",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Email" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "email",
							value: email,
							onChange: (e) => setEmail(e.target.value),
							required: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "space-y-1.5",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Label, { children: "Mot de passe" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							type: "password",
							value: password,
							onChange: (e) => setPassword(e.target.value),
							required: true
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						className: "w-full",
						disabled: loading,
						children: loading ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(LoaderCircle, { className: "h-4 w-4 animate-spin" }) : "Se connecter"
					})
				]
			})]
		})
	});
}
//#endregion
export { LoginPage as component };

import { a as __toESM } from "../_runtime.mjs";
import { n as AnimatePresence, t as motion } from "../_libs/framer-motion.mjs";
import { u as require_react } from "../_libs/@floating-ui/react-dom+[...].mjs";
import { c as require_jsx_runtime } from "../_libs/@radix-ui/react-arrow+[...].mjs";
import { A as Paperclip, F as MicOff, J as FileText, P as Mic, Y as FilePlusCorner, ht as ArrowUp, l as TrendingUp, o as UserPlus, pt as Bot, r as Wallet, w as Receipt } from "../_libs/lucide-react.mjs";
import { c as createServerFn } from "./createServerFn-CIHAFgYl.mjs";
import { t as supabase } from "./client-DiGEereT.mjs";
import { t as createSsrRpc } from "./createSsrRpc-DrJiPTK1.mjs";
import { t as AppShell } from "./AppShell-B_T5tO-_.mjs";
import { i as stringType, r as objectType } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/AssistantPage-DaYbcXg8.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function VoiceWave() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex items-center gap-1 h-6",
		children: Array.from({ length: 22 }).map((_, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
			className: "w-[3px] rounded-full bg-gradient-to-t from-primary to-primary-glow",
			animate: { height: [
				"20%",
				"100%",
				"30%",
				"80%",
				"20%"
			] },
			transition: {
				duration: 1.1 + i % 5 * .12,
				repeat: Infinity,
				ease: "easeInOut",
				delay: i * .04
			},
			style: { height: "40%" }
		}, i))
	});
}
function AiBubble({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "flex items-start gap-3 max-w-2xl",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "shrink-0 h-9 w-9 rounded-2xl bg-gradient-to-br from-primary to-primary-glow grid place-items-center shadow-md shadow-primary/30",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bot, { className: "h-4 w-4 text-white" })
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "rounded-2xl rounded-tl-md bg-muted/60 border border-border px-4 py-3 text-sm leading-relaxed",
			children
		})]
	});
}
function UserBubble({ children }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex justify-end",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "max-w-xl rounded-2xl rounded-tr-md bg-gradient-to-br from-primary to-primary-glow text-primary-foreground px-4 py-3 text-sm leading-relaxed shadow-md shadow-primary/20",
			children
		})
	});
}
function TypingBubble() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AiBubble, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "flex items-center gap-1.5 py-0.5",
		children: [
			0,
			1,
			2
		].map((i) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.span, {
			className: "h-1.5 w-1.5 rounded-full bg-muted-foreground",
			animate: {
				opacity: [
					.3,
					1,
					.3
				],
				y: [
					0,
					-2,
					0
				]
			},
			transition: {
				duration: 1,
				repeat: Infinity,
				delay: i * .15
			}
		}, i))
	}) });
}
var callGemini = createServerFn({ method: "POST" }).validator(objectType({ prompt: stringType() })).handler(createSsrRpc("51501365e6a993db5715029febc2c9f7073a5b6af5ace3730f7c65b50ad8aab0"));
function inferPageContext() {
	const referrer = document.referrer;
	if (!referrer) return null;
	const path = new URL(referrer).pathname;
	if (path.includes("/ventes")) return {
		page: "ventes",
		table: "ventes"
	};
	if (path.includes("/achats")) return {
		page: "achats",
		table: "achats"
	};
	if (path.includes("/clients")) return {
		page: "clients",
		table: "clients"
	};
	if (path.includes("/fournisseurs")) return {
		page: "fournisseurs",
		table: "fournisseurs"
	};
	return {
		page: "unknown",
		path
	};
}
async function processAssistantRequest(prompt) {
	const pageContext = inferPageContext();
	try {
		const aiText = (await callGemini({ prompt: `Tu es un assistant expert pour l'ERP MMS.
      Analyse cette demande utilisateur: "${prompt}"${pageContext ? `\n\nCONTEXTE ACTUEL DE L'UTILISATEUR: ${JSON.stringify(pageContext)}` : "\n\n(Aucun contexte de page spécifique n'est disponible)"}
      
      Réponds en français, de manière naturelle et contextuelle.` })).text;
		if (pageContext?.table === "ventes" && (prompt.toLowerCase().includes("chiffre d'affaires") || prompt.toLowerCase().includes("ventes"))) {
			const { data, error } = await supabase.from("ventes").select("total");
			if (error) throw error;
			return `D'après les données actuelles de la page Ventes, le chiffre d'affaires total est de ${data.reduce((sum, v) => sum + (v.total || 0), 0).toLocaleString()} FCFA.`;
		}
		return aiText || "Je ne suis pas encore capable de répondre à cette question.";
	} catch (error) {
		console.error("AI Service Error:", error);
		if (error instanceof Error && error.message.includes("Gemini API key not configured")) return "La clé API Gemini n'est pas configurée.";
		return "Une erreur est survenue.";
	}
}
var quickActions = [
	{
		icon: FileText,
		label: "Créer une facture",
		hint: "Nouvelle facture client"
	},
	{
		icon: FilePlusCorner,
		label: "Créer un devis",
		hint: "Devis rapide"
	},
	{
		icon: UserPlus,
		label: "Ajouter un client",
		hint: "Nouveau contact"
	},
	{
		icon: Receipt,
		label: "Enregistrer une dépense",
		hint: "Sortie de caisse"
	},
	{
		icon: Wallet,
		label: "Ventes du jour",
		hint: "Résumé quotidien"
	},
	{
		icon: TrendingUp,
		label: "Consulter le bénéfice",
		hint: "Marge nette"
	}
];
var uid = () => Math.random().toString(36).slice(2);
function ChatWorkspace() {
	const [messages, setMessages] = (0, import_react.useState)([]);
	const [input, setInput] = (0, import_react.useState)("");
	const [listening, setListening] = (0, import_react.useState)(false);
	const scrollRef = (0, import_react.useRef)(null);
	(0, import_react.useEffect)(() => {
		scrollRef.current?.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: "smooth"
		});
	}, [messages]);
	const handleUserMessage = async (userText) => {
		const userMsg = {
			id: uid(),
			kind: "user",
			text: userText
		};
		const typingId = uid();
		setMessages((m) => [
			...m,
			userMsg,
			{
				id: typingId,
				kind: "typing"
			}
		]);
		try {
			const aiResponse = await processAssistantRequest(userText);
			setMessages((m) => [...m.filter((x) => x.id !== typingId), {
				id: uid(),
				kind: "ai",
				text: aiResponse
			}]);
		} catch (error) {
			setMessages((m) => [...m.filter((x) => x.id !== typingId), {
				id: uid(),
				kind: "ai",
				text: "Désolé, une erreur est survenue."
			}]);
		}
	};
	const send = (text) => {
		const value = (text ?? input).trim();
		if (!value) return;
		setInput("");
		handleUserMessage(value);
	};
	const empty = messages.length === 0;
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
		/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("header", {
			className: "px-6 md:px-10 pt-8 pb-4",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.h1, {
				initial: {
					opacity: 0,
					y: 6
				},
				animate: {
					opacity: 1,
					y: 0
				},
				className: "text-3xl md:text-4xl font-bold tracking-tight",
				children: ["Bonjour Bamba ", /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "inline-block",
					children: "👋"
				})]
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(motion.p, {
				initial: {
					opacity: 0,
					y: 6
				},
				animate: {
					opacity: 1,
					y: 0
				},
				transition: { delay: .05 },
				className: "mt-1 text-muted-foreground",
				children: "Que souhaitez-vous faire aujourd'hui ?"
			})]
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			ref: scrollRef,
			className: "flex-1 overflow-y-auto scrollbar-thin px-6 md:px-10 pb-6",
			children: empty ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "max-w-4xl mx-auto mt-2",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					className: "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3",
					children: quickActions.map((a, i) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.button, {
						initial: {
							opacity: 0,
							y: 8
						},
						animate: {
							opacity: 1,
							y: 0
						},
						transition: { delay: .04 * i },
						whileHover: { y: -2 },
						onClick: () => send(a.label),
						className: "group text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all",
						children: [
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors",
								children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(a.icon, { className: "h-5 w-5" })
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "font-medium text-sm",
								children: a.label
							}),
							/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "text-xs text-muted-foreground mt-0.5",
								children: a.hint
							})
						]
					}, a.label))
				})
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "max-w-4xl mx-auto space-y-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, {
					initial: false,
					children: messages.map((m) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
						initial: {
							opacity: 0,
							y: 8
						},
						animate: {
							opacity: 1,
							y: 0
						},
						exit: { opacity: 0 },
						children: [
							m.kind === "user" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UserBubble, { children: m.text }),
							m.kind === "ai" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AiBubble, { children: m.text }),
							m.kind === "typing" && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TypingBubble, {})
						]
					}, m.id))
				})
			})
		}),
		/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "px-6 md:px-10 pb-6",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "max-w-4xl mx-auto",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(AnimatePresence, { children: listening && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(motion.div, {
						initial: {
							opacity: 0,
							y: 6
						},
						animate: {
							opacity: 1,
							y: 0
						},
						exit: {
							opacity: 0,
							y: 6
						},
						className: "mb-3 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(VoiceWave, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
							className: "text-sm font-medium text-primary",
							children: "Je vous écoute..."
						})]
					}) }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "rounded-3xl border border-border bg-card shadow-lg shadow-primary/5 p-2 pl-4 flex items-end gap-2",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("textarea", {
							value: input,
							onChange: (e) => setInput(e.target.value),
							onKeyDown: (e) => {
								if (e.key === "Enter" && !e.shiftKey) {
									e.preventDefault();
									send();
								}
							},
							rows: 1,
							placeholder: "Décrivez ce que vous souhaitez faire...",
							className: "flex-1 resize-none bg-transparent outline-none py-3 text-sm placeholder:text-muted-foreground max-h-40 scrollbar-thin"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex items-center gap-1.5 pb-1",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => setListening((v) => !v),
									className: `h-10 w-10 grid place-items-center rounded-2xl transition-all ${listening ? "bg-gradient-to-br from-primary to-primary-glow text-white shadow-lg shadow-primary/40" : "text-muted-foreground hover:bg-muted"}`,
									"aria-label": "Micro",
									children: listening ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MicOff, { className: "h-4 w-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Mic, { className: "h-4 w-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									className: "h-10 w-10 grid place-items-center rounded-2xl text-muted-foreground hover:bg-muted transition-colors",
									"aria-label": "Pièce jointe",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Paperclip, { className: "h-4 w-4" })
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									onClick: () => send(),
									disabled: !input.trim(),
									className: "h-10 w-10 grid place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-white shadow-md shadow-primary/30 disabled:opacity-40 disabled:shadow-none transition-all hover:scale-[1.03]",
									"aria-label": "Envoyer",
									children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ArrowUp, { className: "h-4 w-4" })
								})
							]
						})]
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-center text-xs text-muted-foreground",
						children: "MMS AI CORE peut faire des erreurs — vérifiez les informations importantes."
					})
				]
			})
		})
	] });
}
function AssistantPage() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, {
		title: "Assistant IA",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatWorkspace, {})
	});
}
//#endregion
export { AssistantPage };

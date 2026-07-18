import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  FilePlus2,
  UserPlus,
  Receipt,
  TrendingUp,
  Wallet,
  Mic,
  Paperclip,
  ArrowUp,
  MicOff,
} from "lucide-react";
import { Sidebar } from "@/components/mms/Sidebar";
import { VoiceWave } from "@/components/mms/VoiceWave";
import {
  AiBubble,
  UserBubble,
  TypingBubble,
  type AnalysisStep,
  type InvoiceResult,
} from "./ChatParts";
import { processAssistantRequest } from "../services/ai-logic";

type Msg =
  | { id: string; kind: "user"; text: string }
  | { id: string; kind: "ai"; text: string }
  | { id: string; kind: "typing" };

const quickActions = [
  { icon: FileText, label: "Créer une facture", hint: "Nouvelle facture client" },
  { icon: FilePlus2, label: "Créer un devis", hint: "Devis rapide" },
  { icon: UserPlus, label: "Ajouter un client", hint: "Nouveau contact" },
  { icon: Receipt, label: "Enregistrer une dépense", hint: "Sortie de caisse" },
  { icon: Wallet, label: "Ventes du jour", hint: "Résumé quotidien" },
  { icon: TrendingUp, label: "Consulter le bénéfice", hint: "Marge nette" },
];

const uid = () => Math.random().toString(36).slice(2);

export function ChatWorkspace() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleUserMessage = async (userText: string) => {
    const userMsg: Msg = { id: uid(), kind: "user", text: userText };
    const typingId = uid();
    setMessages((m) => [...m, userMsg, { id: typingId, kind: "typing" }]);

    try {
      const aiResponse = await processAssistantRequest(userText);
      setMessages((m) => [
        ...m.filter((x) => x.id !== typingId),
        { id: uid(), kind: "ai", text: aiResponse },
      ]);
    } catch (error) {
      setMessages((m) => [
        ...m.filter((x) => x.id !== typingId),
        { id: uid(), kind: "ai", text: "Désolé, une erreur est survenue." },
      ]);
    }
  };

  const send = (text?: string) => {
    const value = (text ?? input).trim();
    if (!value) return;
    setInput("");
    handleUserMessage(value);
  };

  const empty = messages.length === 0;

  return (
    <>
      {/* Header */}
      <header className="px-6 md:px-10 pt-8 pb-4">
        <motion.h1
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-3xl md:text-4xl font-bold tracking-tight"
        >
          Bonjour Bamba <span className="inline-block">👋</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="mt-1 text-muted-foreground"
        >
          Que souhaitez-vous faire aujourd'hui ?
        </motion.p>
      </header>

      {/* Chat area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-6 md:px-10 pb-6">
        {empty ? (
          <div className="max-w-4xl mx-auto mt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickActions.map((a, i) => (
                <motion.button
                  key={a.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.04 * i }}
                  whileHover={{ y: -2 }}
                  onClick={() => send(a.label)}
                  className="group text-left rounded-2xl border border-border bg-card p-4 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
                >
                  <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary grid place-items-center mb-3 group-hover:bg-primary group-hover:text-white transition-colors">
                    <a.icon className="h-5 w-5" />
                  </div>
                  <div className="font-medium text-sm">{a.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{a.hint}</div>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                >
                  {m.kind === "user" && <UserBubble>{m.text}</UserBubble>}
                  {m.kind === "ai" && <AiBubble>{m.text}</AiBubble>}
                  {m.kind === "typing" && <TypingBubble />}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="px-6 md:px-10 pb-6">
        <div className="max-w-4xl mx-auto">
          <AnimatePresence>
            {listening && (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                className="mb-3 flex items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 px-4 py-3"
              >
                <VoiceWave />
                <div className="text-sm font-medium text-primary">Je vous écoute...</div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="rounded-3xl border border-border bg-card shadow-lg shadow-primary/5 p-2 pl-4 flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              rows={1}
              placeholder="Décrivez ce que vous souhaitez faire..."
              className="flex-1 resize-none bg-transparent outline-none py-3 text-sm placeholder:text-muted-foreground max-h-40 scrollbar-thin"
            />
            <div className="flex items-center gap-1.5 pb-1">
              <button
                onClick={() => setListening((v) => !v)}
                className={`h-10 w-10 grid place-items-center rounded-2xl transition-all ${
                  listening
                    ? "bg-gradient-to-br from-primary to-primary-glow text-white shadow-lg shadow-primary/40"
                    : "text-muted-foreground hover:bg-muted"
                }`}
                aria-label="Micro"
              >
                {listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
              <button
                className="h-10 w-10 grid place-items-center rounded-2xl text-muted-foreground hover:bg-muted transition-colors"
                aria-label="Pièce jointe"
              >
                <Paperclip className="h-4 w-4" />
              </button>
              <button
                onClick={() => send()}
                disabled={!input.trim()}
                className="h-10 w-10 grid place-items-center rounded-2xl bg-gradient-to-br from-primary to-primary-glow text-white shadow-md shadow-primary/30 disabled:opacity-40 disabled:shadow-none transition-all hover:scale-[1.03]"
                aria-label="Envoyer"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </div>
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            MMS AI CORE peut faire des erreurs — vérifiez les informations importantes.
          </p>
        </div>
      </div>
    </>
  );
}

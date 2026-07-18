import { motion, AnimatePresence } from "framer-motion";
import { Bot, Check, FileCheck2, Printer, MessageCircle, Eye, Loader2 } from "lucide-react";

export type AnalysisStep = { label: string; done: boolean };

export function AnalysisCard({ steps }: { steps: AnalysisStep[] }) {
  const active = steps.findIndex((s) => !s.done);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm max-w-xl"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="h-8 w-8 rounded-xl bg-primary/10 grid place-items-center">
          <Loader2 className="h-4 w-4 text-primary animate-spin" />
        </div>
        <div>
          <div className="font-semibold text-sm">Analyse de votre demande...</div>
          <div className="text-xs text-muted-foreground">MMS AI CORE traite votre requête</div>
        </div>
      </div>
      <ul className="space-y-2.5">
        {steps.map((s, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span
              className={`h-5 w-5 rounded-full grid place-items-center transition-colors ${
                s.done
                  ? "bg-primary text-white"
                  : i === active
                    ? "bg-primary/15 text-primary"
                    : "bg-muted text-muted-foreground"
              }`}
            >
              {s.done ? (
                <Check className="h-3 w-3" />
              ) : i === active ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-50" />
              )}
            </span>
            <span className={s.done ? "text-foreground" : "text-muted-foreground"}>{s.label}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

export type InvoiceResult = {
  client: string;
  amount: string;
  payment: string;
  date: string;
};

export function InvoiceCard({ invoice }: { invoice: InvoiceResult }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="rounded-2xl border border-border bg-card p-5 shadow-sm max-w-xl overflow-hidden relative"
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary-glow" />
      <div className="flex items-center gap-2 mb-4">
        <div className="h-9 w-9 rounded-xl bg-green-500/10 text-green-600 grid place-items-center">
          <FileCheck2 className="h-5 w-5" />
        </div>
        <div>
          <div className="font-semibold">Facture créée avec succès</div>
          <div className="text-xs text-muted-foreground">Prête à être envoyée</div>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 text-sm mb-4">
        <div className="rounded-xl bg-muted/60 p-3">
          <dt className="text-xs text-muted-foreground">Client</dt>
          <dd className="font-medium mt-0.5">{invoice.client}</dd>
        </div>
        <div className="rounded-xl bg-muted/60 p-3">
          <dt className="text-xs text-muted-foreground">Montant</dt>
          <dd className="font-semibold mt-0.5 text-primary">{invoice.amount}</dd>
        </div>
        <div className="rounded-xl bg-muted/60 p-3">
          <dt className="text-xs text-muted-foreground">Paiement</dt>
          <dd className="font-medium mt-0.5">{invoice.payment}</dd>
        </div>
        <div className="rounded-xl bg-muted/60 p-3">
          <dt className="text-xs text-muted-foreground">Date</dt>
          <dd className="font-medium mt-0.5">{invoice.date}</dd>
        </div>
      </dl>

      <div className="flex flex-wrap gap-2">
        <button className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 transition-opacity">
          <Printer className="h-4 w-4" /> Imprimer
        </button>
        <button className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium bg-green-500 text-white hover:opacity-90 transition-opacity">
          <MessageCircle className="h-4 w-4" /> WhatsApp
        </button>
        <button className="inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-medium bg-muted text-foreground hover:bg-accent transition-colors">
          <Eye className="h-4 w-4" /> Voir
        </button>
      </div>
    </motion.div>
  );
}

export function AiBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 max-w-2xl">
      <div className="shrink-0 h-9 w-9 rounded-2xl bg-gradient-to-br from-primary to-primary-glow grid place-items-center shadow-md shadow-primary/30">
        <Bot className="h-4 w-4 text-white" />
      </div>
      <div className="rounded-2xl rounded-tl-md bg-muted/60 border border-border px-4 py-3 text-sm leading-relaxed">
        {children}
      </div>
    </div>
  );
}

export function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-xl rounded-2xl rounded-tr-md bg-gradient-to-br from-primary to-primary-glow text-primary-foreground px-4 py-3 text-sm leading-relaxed shadow-md shadow-primary/20">
        {children}
      </div>
    </div>
  );
}

export function TypingBubble() {
  return (
    <AiBubble>
      <div className="flex items-center gap-1.5 py-0.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-muted-foreground"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </div>
    </AiBubble>
  );
}

// re-export AnimatePresence so callers can wrap lists
export { AnimatePresence };

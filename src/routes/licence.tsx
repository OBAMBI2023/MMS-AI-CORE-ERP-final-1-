import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Headphones, LogOut, TriangleAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

function LicenseUnavailablePage() {
  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.assign("/login");
  };

  return (
    <main className="relative grid min-h-[100dvh] place-items-center overflow-hidden bg-slate-50 px-4 py-8 selection:bg-blue-200 sm:px-6 dark:bg-slate-950 dark:selection:bg-blue-800">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(37,99,235,0.12),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(79,70,229,0.10),transparent_32%)] dark:bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.16),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.12),transparent_32%)]"
        aria-hidden="true"
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.35] [background-image:linear-gradient(rgba(148,163,184,0.16)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.16)_1px,transparent_1px)] [background-size:40px_40px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)] dark:opacity-20"
        aria-hidden="true"
      />

      <motion.section
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative w-full max-w-xl rounded-[2rem] border border-white/80 bg-white/90 p-6 text-center shadow-[0_24px_80px_-24px_rgba(15,23,42,0.25)] backdrop-blur-xl sm:p-10 dark:border-slate-800/80 dark:bg-slate-900/90 dark:shadow-black/40"
      >
        <div className="mb-8 flex items-center justify-center gap-2 text-sm font-bold tracking-[0.18em] text-slate-900 dark:text-white">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600 text-xs text-white shadow-lg shadow-blue-600/20">
            A
          </span>
          AUREX ERP
        </div>

        <motion.div
          initial={{ scale: 0.8, rotate: -8 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ delay: 0.14, duration: 0.4, ease: "easeOut" }}
          className="relative mx-auto grid h-20 w-20 place-items-center rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50 to-orange-100 text-amber-600 shadow-lg shadow-amber-500/10 dark:border-amber-400/15 dark:from-amber-400/15 dark:to-orange-500/10 dark:text-amber-400"
        >
          <span className="absolute inset-2 rounded-2xl border border-white/70 dark:border-white/5" />
          <TriangleAlert className="relative h-9 w-9" strokeWidth={1.8} aria-hidden="true" />
        </motion.div>

        <h1 className="mt-7 text-balance text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl dark:text-white">
          Votre abonnement nécessite une action
        </h1>
        <p className="mx-auto mt-5 max-w-md text-pretty text-[15px] leading-7 text-slate-600 sm:text-base dark:text-slate-300">
          L&apos;accès à votre espace AUREX ERP est momentanément indisponible.
          <span className="mt-3 block">
            Votre période d&apos;essai est terminée ou votre abonnement n&apos;est plus actif. Dès le
            renouvellement de votre abonnement, vous retrouverez immédiatement l&apos;accès à toutes
            vos données.
          </span>
        </p>

        <div className="mt-8 grid gap-3">
          <button
            type="button"
            className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-0.5 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl hover:shadow-blue-600/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900"
          >
            Renouveler maintenant
            <ArrowRight
              className="h-4 w-4 transition-transform group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </button>

          <button
            type="button"
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-50/70 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500/40 dark:hover:bg-blue-500/10 dark:hover:text-blue-300 dark:focus-visible:ring-offset-slate-900"
          >
            <Headphones className="h-4 w-4" aria-hidden="true" />
            Contacter le support
          </button>

          <button
            type="button"
            onClick={signOut}
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-offset-slate-900"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Se déconnecter
          </button>
        </div>

        <p className="mt-7 text-xs leading-5 text-slate-400 dark:text-slate-500">
          Vos données restent protégées et seront disponibles dès la réactivation.
        </p>
      </motion.section>
    </main>
  );
}

export const Route = createFileRoute("/licence")({
  component: LicenseUnavailablePage,
});

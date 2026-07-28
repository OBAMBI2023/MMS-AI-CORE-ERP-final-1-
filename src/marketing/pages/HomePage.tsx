import { ArrowRight, BarChart3, Building2, ShieldCheck, Sparkles, Users } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { MarketingCta } from "../components/MarketingCta";

const capabilities = [
  {
    icon: BarChart3,
    title: "Pilotage centralisé",
    description: "Suivez ventes, achats, dépenses et rapports depuis un même espace de travail.",
  },
  {
    icon: Users,
    title: "Relations structurées",
    description: "Centralisez la gestion de vos clients, fournisseurs et utilisateurs.",
  },
  {
    icon: ShieldCheck,
    title: "Accès maîtrisés",
    description: "Organisez les accès selon les rôles et permissions de votre entreprise.",
  },
] as const;

export function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden px-5 py-24 sm:py-32 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.13),transparent_45%)]" />
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.05fr_0.95fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700">
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              Gestion d’entreprise unifiée
            </div>
            <h1 className="mt-6 max-w-4xl text-5xl font-extrabold tracking-[-0.04em] text-slate-950 sm:text-6xl">
              Pilotez votre activité avec une vision claire.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              AUREX ERP réunit vos opérations commerciales, vos achats, vos dépenses et votre
              organisation dans une plateforme SaaS centralisée.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/essai-gratuit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3.5 text-sm font-bold text-white shadow-xl shadow-blue-600/20 hover:bg-blue-700"
              >
                Créer mon espace gratuit
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/fonctionnalites"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Explorer les fonctionnalités
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl">
            <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-blue-100/70 blur-2xl" />
            <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-white/10 pb-5">
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-600">
                    <Building2 className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-bold">Espace entreprise</p>
                    <p className="text-xs text-slate-400">Organisation et opérations</p>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-semibold text-emerald-300">
                  Centralisé
                </span>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {["Ventes & devis", "Achats & fournisseurs", "Clients & services", "Rapports & paramètres"].map(
                  (label) => (
                    <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                      <div className="mb-5 h-2 w-20 rounded-full bg-blue-400/60" />
                      <p className="text-sm font-semibold">{label}</p>
                    </div>
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 px-5 py-20 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="max-w-2xl">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-blue-600">L’essentiel</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl">
              Une base solide pour vos opérations quotidiennes.
            </h2>
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {capabilities.map((capability) => (
              <article key={capability.title} className="rounded-2xl border border-slate-200 bg-white p-6">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-blue-600">
                  <capability.icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 text-lg font-bold">{capability.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{capability.description}</p>
              </article>
            ))}
          </div>
        </div>
      </section>
      <MarketingCta />
    </>
  );
}

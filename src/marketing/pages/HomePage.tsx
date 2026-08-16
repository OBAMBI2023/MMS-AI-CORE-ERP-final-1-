import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  BriefcaseBusiness,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import { PLATFORM_BRANDING } from "@/config/branding";
import { AnimatedCounter } from "../components/AnimatedCounter";

const solutions = [
  {
    name: "Commerce",
    icon: ShoppingCart,
    description: "Pour boutiques, commerces, points de vente et distributeurs.",
  },
  {
    name: "Services",
    icon: BriefcaseBusiness,
    description: "Pour entreprises de services, agences, cabinets et prestataires.",
  },
  {
    name: "Hôtel",
    icon: Store,
    description: "Pour établissements d’hébergement, résidences et hospitality.",
  },
  {
    name: "Restauration",
    icon: WalletCards,
    description: "Pour restaurants, lounges, bars et opérations multi-sites.",
  },
] as const;

type HeroKpiCardProps = {
  icon: typeof TrendingUp;
  label: string;
  valueTarget: number;
  valueDecimals: number;
  valueUnit: string;
  deltaTarget: number;
  positionClassName: string;
  aspectRatio: string;
};

/**
 * Overlays a live, animatable replica on top of the KPI card baked into the
 * hero PNG at the same spot, so its two figures can count up — the rest of
 * the artwork (the woman, tablet, other cards) stays the flat image.
 */
function HeroKpiCard({
  icon: Icon,
  label,
  valueTarget,
  valueDecimals,
  valueUnit,
  deltaTarget,
  positionClassName,
  aspectRatio,
}: HeroKpiCardProps) {
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      className={`pointer-events-none absolute [container-type:inline-size] ${positionClassName}`}
      style={{ aspectRatio }}
      initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      <div className="flex h-full w-full flex-col justify-center rounded-[7cqw] bg-white px-[7cqw] py-[5.5cqw] shadow-[0_18px_45px_rgba(7,26,20,0.14)] ring-1 ring-black/5">
        <div className="flex items-center gap-[3cqw]">
          <span className="grid h-[14cqw] w-[14cqw] shrink-0 place-items-center rounded-[3.2cqw] bg-saovia-primary text-white">
            <Icon className="h-[7cqw] w-[7cqw]" />
          </span>
          <span className="text-[4.4cqw] font-medium leading-tight text-slate-600">{label}</span>
        </div>
        <p className="mt-[3cqw] whitespace-nowrap text-[8.5cqw] font-bold leading-none tracking-tight text-slate-950">
          <AnimatedCounter target={valueTarget} decimals={valueDecimals} durationMs={1300} />{" "}
          <span className="text-[6.5cqw] font-semibold text-slate-700">{valueUnit}</span>
        </p>
        <p className="mt-[2.5cqw] flex items-center gap-[1.5cqw] text-[4.2cqw] font-semibold text-saovia-primary">
          <span aria-hidden="true">▲</span>
          <AnimatedCounter target={deltaTarget} decimals={1} suffix="%" durationMs={1300} />
        </p>
        <p className="text-[3.6cqw] text-slate-400">vs mois dernier</p>
      </div>
    </motion.div>
  );
}

export function HomePage() {
  const [selectedSolution, setSelectedSolution] = useState<(typeof solutions)[number]["name"]>("Commerce");

  return (
    <main className="bg-[#f3f5f9] px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">
      <div className="mx-auto max-w-[1470px] overflow-hidden rounded-[32px] bg-white shadow-[0_28px_90px_rgba(7,26,20,0.10)] ring-1 ring-black/5">
        <section id="produits" className="relative overflow-hidden px-5 pb-10 pt-8 sm:px-8 sm:pb-12 sm:pt-10 lg:px-12 lg:pb-14 lg:pt-12">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(43,98,239,0.08),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(212,175,55,0.10),transparent_28%)]" />

          <div className="mx-auto grid max-w-[1360px] items-start gap-10 lg:grid-cols-[0.45fr_0.55fr] lg:gap-12 xl:gap-16">
            <div className="max-w-2xl">
              <h1 className="text-[clamp(2.7rem,5vw,5.15rem)] font-black leading-[0.96] tracking-[-0.055em] text-slate-950">
                Pilotez votre activité avec{" "}
                <span className="text-saovia-primary">{PLATFORM_BRANDING.name}</span>
              </h1>

              <p className="mt-6 max-w-[620px] text-[1.03rem] leading-8 text-slate-600 sm:text-[1.08rem] sm:leading-8">
                SAOVIA centralise vos opérations, vos ventes, vos clients, vos stocks, votre facturation, vos
                dépenses, vos rapports et la gestion de vos établissements dans une plateforme simple, moderne et
                accessible partout.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/essai-gratuit"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-saovia-primary px-6 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(43,98,239,0.22)] transition-transform transition-colors hover:-translate-y-0.5 hover:bg-saovia-primary-hover"
                >
                  Essayer gratuitement
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#solutions"
                  className="inline-flex items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-4 text-base font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
                >
                  Découvrir les solutions
                </a>
              </div>
            </div>

            <div className="relative mx-auto flex w-full max-w-[420px] items-center justify-center sm:max-w-[520px] lg:max-w-none lg:justify-end lg:self-center">
              <div className="relative w-full max-w-[420px] sm:max-w-[520px] lg:max-w-[640px] xl:max-w-[720px]">
                <img
                  src="/branding/b5c578f9-b170-44f4-bd3a-4579f691342b.png"
                  alt="Femme d’affaires tenant une tablette affichant le tableau de bord SAOVIA, entourée d’indicateurs clés : chiffre d’affaires, impayés, arrivées/départs et disponibilité des logements"
                  className="block h-auto w-full object-contain"
                />
                <HeroKpiCard
                  icon={TrendingUp}
                  label="Chiffre d'affaires"
                  valueTarget={2.35}
                  valueDecimals={2}
                  valueUnit="M FCFA"
                  deltaTarget={18.3}
                  positionClassName="left-[4.1%] top-[7.2%] w-[37.6%]"
                  aspectRatio="414 / 272"
                />
                <HeroKpiCard
                  icon={AlertCircle}
                  label="Impayés"
                  valueTarget={6.87}
                  valueDecimals={2}
                  valueUnit="M FCFA"
                  deltaTarget={12.6}
                  positionClassName="left-[62.7%] top-[29.9%] w-[36.7%]"
                  aspectRatio="404 / 232"
                />
              </div>
            </div>
          </div>
        </section>

        <section id="solutions" className="px-5 pb-16 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-[1360px]">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold uppercase tracking-[0.22em] text-saovia-primary">Solutions</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                Une solution adaptée à votre activité
              </h2>
              <p className="mt-4 text-lg leading-8 text-slate-600">
                Choisissez votre solution et retrouvez uniquement les outils dont votre entreprise a besoin.
              </p>
            </div>

            <div id="modules" className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {solutions.map((solution) => {
                const Icon = solution.icon;
                const active = solution.name === selectedSolution;
                return (
                  <button
                    key={solution.name}
                    type="button"
                    onClick={() => setSelectedSolution(solution.name)}
                    className={`rounded-[28px] border p-5 text-left transition-all ${
                      active
                        ? "border-saovia-primary/20 bg-saovia-primary/4 shadow-[0_18px_50px_rgba(7,26,20,0.08)]"
                        : "border-black/5 bg-white shadow-[0_12px_35px_rgba(7,26,20,0.04)] hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(7,26,20,0.08)]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-saovia-primary/10 text-saovia-primary">
                        <Icon className="h-6 w-6" />
                      </div>
                      {active ? <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-saovia-primary ring-1 ring-saovia-primary/15">Sélectionnée</span> : null}
                    </div>
                    <h3 className="mt-5 text-xl font-semibold text-slate-950">{solution.name}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{solution.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section id="support" className="px-5 pb-10 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-[1360px] rounded-[32px] bg-saovia-secondary px-6 py-10 text-white shadow-[0_24px_70px_rgba(0,24,96,0.18)] sm:px-10 lg:px-12">
            <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/65">Support</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
                  Un accompagnement réactif, du déploiement à l’usage quotidien
                </h2>
                <p className="mt-4 max-w-2xl text-base leading-7 text-white/75">
                  SAOVIA vous aide à configurer vos opérations, structurer vos modules et suivre votre activité avec
                  une interface pensée pour les équipes terrain comme pour le pilotage.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  "Support par modules",
                  "Déploiement guidé",
                  "Gestion des accès",
                  "Rapports lisibles",
                ].map((item) => (
                  <div key={item} className="rounded-2xl bg-white/6 px-4 py-4 text-sm font-medium text-white ring-1 ring-white/10">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="tarifs" className="px-5 pb-10 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-[1360px] rounded-[32px] bg-white px-6 py-10 ring-1 ring-black/5 sm:px-10">
            <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-saovia-primary">Tarifs</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">
                  Une base claire pour démarrer sans friction
                </h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Commencez par l’essai gratuit, validez vos modules essentiels puis structurez votre déploiement à
                  votre rythme.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  ["Essai", "Gratuit"],
                  ["Modules", "Selon l’activité"],
                  ["Support", "Inclus"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[24px] bg-saovia-primary-soft p-5 ring-1 ring-black/5">
                    <p className="text-sm text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="contact" className="px-5 pb-16 sm:px-8 lg:px-12">
          <div className="mx-auto max-w-[1360px] rounded-[32px] bg-saovia-primary-soft px-6 py-10 ring-1 ring-black/5 sm:px-10">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-saovia-primary">Contact</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">Prêt à essayer SAOVIA gratuitement ?</h2>
                <p className="mt-3 text-base leading-7 text-slate-600">
                  Lancez votre espace, testez les modules et validez l’adéquation avec votre activité en quelques minutes.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/essai-gratuit"
                  className="inline-flex items-center justify-center rounded-2xl bg-saovia-primary px-6 py-4 text-base font-semibold text-white shadow-[0_18px_40px_rgba(43,98,239,0.20)] transition-transform transition-colors hover:-translate-y-0.5 hover:bg-saovia-primary-hover"
                >
                  Essayer gratuitement
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-6 py-4 text-base font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
                >
                  Connexion
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

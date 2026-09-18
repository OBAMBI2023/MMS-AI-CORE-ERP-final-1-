import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  Sparkles,
  FileWarning,
  CalendarX,
  Users2,
  BedDouble,
  TrendingDown,
  EyeOff,
  BedSingle,
  CalendarCheck,
  Contact,
  LayoutDashboard,
  Wallet,
  Bell,
  UserCog,
  Globe2,
  MessageCircle,
  Send,
  Inbox,
  CheckCheck,
  Building2,
  Home,
  Warehouse,
  Layers,
  Zap,
  Puzzle,
} from "lucide-react";

const PROBLEMS = [
  {
    icon: CalendarX,
    text: "Réservations difficiles à suivre, éparpillées entre carnets et messages",
  },
  { icon: BedDouble, text: "Disponibilités des chambres et logements incertaines en temps réel" },
  { icon: Users2, text: "Historique clients dispersé, aucune vue d'ensemble" },
  { icon: FileWarning, text: "Suivi des chambres/logements géré à la main" },
  { icon: TrendingDown, text: "Revenus difficiles à consolider et à analyser" },
  { icon: EyeOff, text: "Aucune visibilité en ligne pour attirer de nouveaux voyageurs" },
];

const FEATURES = [
  {
    icon: BedSingle,
    title: "Chambres & logements",
    description: "Créez et gérez vos chambres ou logements, leurs tarifs, équipements et statuts.",
  },
  {
    icon: CalendarCheck,
    title: "Réservations",
    description: "Suivez vos réservations, arrivées et départs depuis un planning centralisé.",
  },
  {
    icon: Contact,
    title: "Clients",
    description: "Retrouvez l'historique et les coordonnées de vos clients en un seul endroit.",
  },
  {
    icon: LayoutDashboard,
    title: "Tableau de bord",
    description: "Occupation, arrivées, départs et indicateurs clés de votre établissement.",
  },
  {
    icon: Wallet,
    title: "Revenus",
    description: "Facturation et suivi financier de votre activité hôtelière.",
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Restez informé de l'activité de votre établissement.",
  },
  {
    icon: UserCog,
    title: "Équipe",
    description: "Gérez les accès et les rôles de votre personnel.",
  },
  {
    icon: Globe2,
    title: "Présence en ligne",
    description: "Publiez vos logements disponibles sur la vitrine SAOVIA HOTEL.",
  },
];

// Le backend ne dispose pas d'un système de médiation des demandes
// (pas de file d'attente SAOVIA entre le visiteur et l'établissement) : le
// parcours réel est un contact direct WhatsApp/téléphone depuis la fiche
// logement. Ces étapes reflètent ce fonctionnement réel plutôt que le
// schéma "SAOVIA reçoit puis propose au tenant" — pour ne pas décrire un
// mécanisme qui n'existe pas.
const WORKFLOW_STEPS = [
  {
    icon: Send,
    title: "Découverte",
    description: "Le visiteur découvre un logement publié sur la vitrine SAOVIA.",
  },
  {
    icon: MessageCircle,
    title: "Contact direct",
    description:
      "Il contacte l'établissement par WhatsApp ou téléphone, directement depuis la fiche du logement.",
  },
  {
    icon: Inbox,
    title: "Échange",
    description:
      "L'établissement échange avec lui pour confirmer les disponibilités et les modalités.",
  },
  {
    icon: CheckCheck,
    title: "Confirmation",
    description:
      "Le séjour est confirmé directement entre l'établissement et le voyageur, sans intermédiaire.",
  },
];

const TARGETS = [
  { icon: Building2, label: "Hôtels" },
  { icon: Home, label: "Résidences" },
  { icon: Warehouse, label: "Appart'hôtels" },
  { icon: Layers, label: "Maisons d'hôtes" },
  { icon: BedDouble, label: "Résidences meublées" },
];

const WHY_SAOVIA = [
  {
    icon: LayoutDashboard,
    title: "Centralisé",
    description: "Chambres, réservations, clients et revenus dans un seul espace.",
  },
  {
    icon: Zap,
    title: "Simple",
    description: "Une interface pensée pour les équipes terrain comme pour le pilotage.",
  },
  {
    icon: Globe2,
    title: "Accessible",
    description: "Disponible partout, sur ordinateur comme sur mobile.",
  },
  {
    icon: Puzzle,
    title: "Évolutif",
    description: "Des modules qui s'adaptent à la taille de votre établissement.",
  },
];

function DashboardPreview() {
  const tiles = [
    { label: "Occupation", value: "•••", icon: BedDouble },
    { label: "Réservations", value: "•••", icon: CalendarCheck },
    { label: "Arrivées", value: "•••", icon: ArrowRight },
    { label: "Départs", value: "•••", icon: ArrowRight },
    { label: "Revenus", value: "•••", icon: Wallet },
    { label: "Disponibilité", value: "•••", icon: LayoutDashboard },
  ];
  return (
    <div className="relative">
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-2xl sm:p-6">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <span className="text-xs font-semibold uppercase tracking-wide text-white/50">
            Aperçu de l'interface — Tableau de bord Hôtel
          </span>
          <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-medium text-white/40">
            Interface de démonstration
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {tiles.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-xl bg-white/[0.04] p-4 ring-1 ring-white/5">
              <Icon className="h-4 w-4 text-[#D4AF37]" />
              <p className="mt-3 text-xl font-bold text-white">{value}</p>
              <p className="mt-1 text-xs text-white/50">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HotelLandingPage() {
  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B1F4D]">
        <div
          className="absolute inset-0 opacity-25"
          style={{
            backgroundImage:
              "radial-gradient(circle at 15% 20%, #D4AF37 0%, transparent 40%), radial-gradient(circle at 85% 70%, #D4AF37 0%, transparent 35%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
            <div className="text-center lg:text-left">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-[#D4AF37]">
                <Sparkles className="h-3.5 w-3.5" />
                SAOVIA HOTEL · Solution de gestion
              </span>
              <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
                Pilotez votre hôtel. Développez votre activité.
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 sm:text-lg lg:mx-0">
                Une plateforme intelligente pour gérer vos chambres, logements, réservations,
                clients, disponibilités et revenus depuis un seul espace.
              </p>
              <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  to="/essai-gratuit"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#D4AF37] px-6 py-4 text-base font-semibold text-[#0B1F4D] shadow-lg shadow-[#D4AF37]/20 transition-transform hover:-translate-y-0.5"
                >
                  Créer mon établissement
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center rounded-2xl border border-white/20 bg-white/5 px-6 py-4 text-base font-semibold text-white transition-colors hover:bg-white/10"
                >
                  Se connecter
                </Link>
              </div>
              <Link
                to="/sitevitrine"
                className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-white/60 transition-colors hover:text-white"
              >
                Découvrir la vitrine
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div
                className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-[#D4AF37]/20 via-transparent to-transparent blur-xl"
                aria-hidden="true"
              />
              <div className="relative aspect-[3/2] overflow-hidden rounded-[1.75rem] ring-1 ring-white/15 shadow-2xl shadow-black/40">
                <img
                  src="/images/hotel/saovia-hotel-hero.jpg"
                  alt="Réceptionniste souriante accueillant les clients depuis une chambre d'hôtel moderne et haut de gamme"
                  width={1536}
                  height={1024}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problème */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-[#0B1F4D] sm:text-3xl">
            Votre établissement mérite mieux que des fichiers Excel et des outils dispersés.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PROBLEMS.map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-start gap-3 rounded-2xl border border-black/5 bg-slate-50 p-4"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#0B1F4D]/50" />
              <p className="text-sm text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
        <p className="mx-auto mt-10 max-w-xl text-center text-lg font-semibold text-[#0B1F4D]">
          SAOVIA centralise votre activité dans une seule plateforme.
        </p>
      </section>

      {/* Dashboard */}
      <section className="bg-[#0B1F4D] py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[#D4AF37]">
              Votre tableau de bord
            </span>
            <h2 className="mt-3 text-2xl font-bold text-white sm:text-3xl">
              Toute votre activité, visible en un coup d'œil.
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-white/70">
              Occupation, réservations, arrivées, départs, revenus et disponibilité : l'ERP Hôtel
              SAOVIA réunit les indicateurs essentiels de votre établissement dans une seule
              interface.
            </p>
          </div>
          <DashboardPreview />
        </div>
      </section>

      {/* Fonctionnalités */}
      <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-[#0B1F4D] sm:text-3xl">
            Tout ce qu'il faut pour gérer votre établissement
          </h2>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B1F4D]/5 text-[#0B1F4D]">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold text-[#0B1F4D]">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Vitrine cross-promo */}
      <section id="solutions" className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 rounded-2xl bg-[#0B1F4D] p-8 text-white sm:p-12 lg:grid-cols-2">
            <div>
              <span className="text-xs font-medium uppercase tracking-wider text-[#D4AF37]">
                Visibilité
              </span>
              <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
                Donnez de la visibilité à vos logements
              </h2>
              <p className="mt-4 max-w-lg leading-relaxed text-white/70">
                Les établissements gérés sur SAOVIA peuvent publier leurs logements disponibles sur
                la vitrine publique SAOVIA HOTEL, consultée par des voyageurs à la recherche d'un
                séjour.
              </p>
              <Link
                to="/sitevitrine"
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-6 py-3.5 text-sm font-semibold text-[#0B1F4D] transition-transform hover:-translate-y-0.5"
              >
                Voir la vitrine
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-[#12295e] via-[#1c3a7a] to-[#0B1F4D]">
              <div className="absolute inset-0 grid place-items-center">
                <Globe2 className="h-16 w-16 text-[#D4AF37]/60" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Workflow */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-[#0B1F4D] sm:text-3xl">Comment ça marche</h2>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Du voyageur à votre établissement, sans réservation automatique non confirmée.
          </p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {WORKFLOW_STEPS.map(({ icon: Icon, title, description }, index) => (
            <div
              key={title}
              className="relative rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
            >
              <span className="absolute -top-3 left-5 flex h-7 w-7 items-center justify-center rounded-full bg-[#0B1F4D] text-xs font-bold text-white">
                {index + 1}
              </span>
              <Icon className="mt-2 h-5 w-5 text-[#D4AF37]" />
              <h3 className="mt-3 font-semibold text-[#0B1F4D]">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Cibles */}
      <section className="bg-slate-50 py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold text-[#0B1F4D] sm:text-3xl">Pour qui ?</h2>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {TARGETS.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-3 rounded-2xl border border-black/5 bg-white p-6 text-center shadow-sm"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0B1F4D]/5 text-[#0B1F4D]">
                  <Icon className="h-5 w-5" />
                </div>
                <p className="text-sm font-semibold text-[#0B1F4D]">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pourquoi SAOVIA */}
      <section id="tarifs" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold text-[#0B1F4D] sm:text-3xl">Pourquoi SAOVIA</h2>
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_SAOVIA.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col items-center text-center sm:items-start sm:text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B1F4D]/5 text-[#0B1F4D]">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-[#0B1F4D]">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Visiteurs */}
      <section className="bg-[#0B1F4D] py-16 text-center text-white sm:py-20">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold sm:text-3xl">Vous cherchez un séjour ?</h2>
          <p className="mt-4 text-white/70">
            Découvrez les hôtels, résidences et logements disponibles sur SAOVIA.
          </p>
          <Link
            to="/sitevitrine"
            className="mt-8 inline-flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-6 py-3.5 text-sm font-semibold text-[#0B1F4D] transition-transform hover:-translate-y-0.5"
          >
            Découvrir les établissements
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-[#0B1F4D] sm:text-4xl">
          Prêt à mieux gérer votre établissement ?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Rejoignez SAOVIA et centralisez votre activité hôtelière.
        </p>
        <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            to="/essai-gratuit"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#0B1F4D] px-6 py-4 text-base font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            Créer mon établissement
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/login"
            className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white px-6 py-4 text-base font-semibold text-slate-800 shadow-sm transition-colors hover:bg-slate-50"
          >
            Se connecter
          </Link>
        </div>
      </section>
    </main>
  );
}

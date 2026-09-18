import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ShieldCheck, Sparkles, Building2, MessageCircle, Clock, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { HeroSearchWidget } from "./HeroSearchWidget";
import { DestinationCard } from "./DestinationCard";
import { FeaturedLodgingCard } from "./FeaturedLodgingCard";
import {
  fetchPublicHotels,
  fetchFeaturedPublicLodgings,
  extractDestinations,
} from "@/integrations/hotel/public-directory";

const SERVICES = [
  {
    icon: MessageCircle,
    title: "Réservation directe",
    description: "Contactez l'établissement par WhatsApp ou téléphone, sans intermédiaire, pour finaliser votre séjour.",
  },
  {
    icon: ShieldCheck,
    title: "Établissements vérifiés",
    description: "Chaque hôtel ou résidence publié est géré par un partenaire actif sur la plateforme SAOVIA.",
  },
  {
    icon: Clock,
    title: "Disponibilité à jour",
    description: "Les logements affichés reflètent en temps réel ce que l'établissement publie depuis son tableau de bord.",
  },
  {
    icon: Compass,
    title: "Une seule plateforme",
    description: "Découvrez plusieurs destinations et établissements partenaires SAOVIA en un seul endroit.",
  },
];

export function HotelVitrineHome() {
  const { data: hotels, isPending: hotelsPending } = useQuery({
    queryKey: ["public-hotels"],
    queryFn: fetchPublicHotels,
    staleTime: 60_000,
  });
  const { data: featuredLodgings, isPending: lodgingsPending } = useQuery({
    queryKey: ["public-featured-lodgings"],
    queryFn: () => fetchFeaturedPublicLodgings(9),
    staleTime: 60_000,
  });

  const destinations = extractDestinations(hotels ?? []).slice(0, 6);

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
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#D4AF37 1px, transparent 1px), linear-gradient(90deg, #D4AF37 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8 lg:py-32">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-[#D4AF37]">
            <Sparkles className="h-3.5 w-3.5" />
            SAOVIA HOTEL
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            Des séjours d'exception,
            <br className="hidden sm:block" /> partout où SAOVIA opère.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
            Hôtels et résidences partenaires, sélectionnés et gérés sur la plateforme SAOVIA :
            confort, service et hospitalité réunis dans une seule expérience.
          </p>

          <HeroSearchWidget destinations={extractDestinations(hotels ?? [])} />
        </div>
      </section>

      {/* Destinations */}
      {destinations.length > 0 && (
        <section id="destinations" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#0B1F4D] sm:text-3xl">Nos destinations</h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Les villes où des établissements SAOVIA Hôtel sont actuellement publiés.
              </p>
            </div>
          </div>
          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {destinations.map((city) => (
              <DestinationCard key={city} city={city} />
            ))}
          </div>
        </section>
      )}

      {/* Logements disponibles */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-[#0B1F4D] sm:text-3xl">Établissements &amp; logements</h2>
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Une sélection de logements réellement disponibles chez nos partenaires.
              </p>
            </div>
            <Link
              to="/sitevitrine/hotels"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#0B1F4D] hover:underline"
            >
              Voir tous les établissements
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {lodgingsPending || hotelsPending ? (
              Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)
            ) : (featuredLodgings ?? []).length > 0 ? (
              featuredLodgings!.map((lodging) => <FeaturedLodgingCard key={lodging.id} lodging={lodging} />)
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-black/10 bg-white p-12 text-center">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-4 font-medium text-[#0B1F4D]">
                  Aucun logement publié pour le moment
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Revenez bientôt — nos établissements partenaires seront bientôt visibles ici.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-[#0B1F4D] sm:text-3xl">Une expérience premium, pensée simplement</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
            Ce que SAOVIA HOTEL vous garantit à chaque réservation.
          </p>
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex flex-col items-center text-center sm:items-start sm:text-left">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B1F4D]/5 text-[#0B1F4D]">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-4 font-semibold text-[#0B1F4D]">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Expérience SAOVIA — éditorial */}
      <section className="bg-[#0B1F4D] py-16 text-white sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-gradient-to-br from-[#12295e] via-[#1c3a7a] to-[#0B1F4D]">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 30%, #D4AF37 0%, transparent 45%)",
              }}
              aria-hidden
            />
            <div className="absolute inset-0 grid place-items-center">
              <Sparkles className="h-16 w-16 text-[#D4AF37]/60" />
            </div>
          </div>
          <div>
            <span className="text-xs font-medium uppercase tracking-wider text-[#D4AF37]">
              L'expérience SAOVIA
            </span>
            <h2 className="mt-3 text-2xl font-bold sm:text-3xl">
              Une hospitalité pensée pour durer, pas seulement pour une nuit.
            </h2>
            <p className="mt-4 max-w-lg leading-relaxed text-white/70">
              Chaque établissement SAOVIA Hôtel gère lui-même ses logements, ses tarifs et ses
              disponibilités depuis la plateforme SAOVIA — ce que vous voyez ici est directement
              ce que l'établissement publie, sans intermédiaire ni surcouche.
            </p>
            <Button asChild size="lg" className="mt-6 bg-[#D4AF37] text-[#0B1F4D] hover:bg-[#D4AF37]/90">
              <Link to="/sitevitrine/hotels">
                Explorer les établissements
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <h2 className="text-3xl font-bold text-[#0B1F4D] sm:text-4xl">
          Votre prochain séjour commence ici.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
          Parcourez les établissements partenaires SAOVIA et contactez-les directement pour
          réserver.
        </p>
        <Button asChild size="lg" className="mt-8 bg-[#0B1F4D] hover:bg-[#0B1F4D]/90">
          <Link to="/sitevitrine/hotels">
            Voir les établissements
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </main>
  );
}

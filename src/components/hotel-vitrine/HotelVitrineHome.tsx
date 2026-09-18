import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search, ArrowRight, ShieldCheck, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HotelCard } from "./HotelCard";
import { fetchPublicHotels } from "@/integrations/hotel/public-directory";

export function HotelVitrineHome() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const { data: hotels, isPending } = useQuery({
    queryKey: ["public-hotels"],
    queryFn: fetchPublicHotels,
    staleTime: 60_000,
  });

  const featured = (hotels ?? []).slice(0, 3);

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault();
    navigate({ to: "/hotel-vitrine/hotels", search: search.trim() ? { q: search.trim() } : {} });
  };

  return (
    <main>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0B1F4D]">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "radial-gradient(circle at 20% 20%, #D4AF37 0%, transparent 40%), radial-gradient(circle at 80% 60%, #D4AF37 0%, transparent 35%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-4 py-24 text-center sm:px-6 sm:py-32 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/40 bg-white/5 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-[#D4AF37]">
            <Sparkles className="h-3.5 w-3.5" />
            SAOVIA Hôtel
          </span>
          <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            Des séjours d'exception,
            <br className="hidden sm:block" /> partout où SAOVIA opère.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/70 sm:text-lg">
            Découvrez les établissements hôteliers partenaires SAOVIA : confort, service et
            hospitalité réunis dans une seule plateforme.
          </p>

          <form
            onSubmit={handleSearch}
            className="mx-auto mt-10 flex max-w-xl flex-col gap-3 rounded-2xl bg-white p-3 shadow-2xl sm:flex-row"
          >
            <div className="flex flex-1 items-center gap-2 px-2">
              <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un établissement, une ville…"
                className="border-0 shadow-none focus-visible:ring-0"
              />
            </div>
            <Button type="submit" size="lg" className="bg-[#0B1F4D] hover:bg-[#0B1F4D]/90">
              Découvrir
              <ArrowRight className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </section>

      {/* Présentation */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-3">
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B1F4D]/5 text-[#0B1F4D]">
              <Building2 className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-semibold text-[#0B1F4D]">Établissements vérifiés</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Chaque établissement est géré par un partenaire actif sur la plateforme SAOVIA.
            </p>
          </div>
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B1F4D]/5 text-[#0B1F4D]">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-semibold text-[#0B1F4D]">Informations fiables</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Les informations affichées proviennent directement de la gestion de
              l'établissement.
            </p>
          </div>
          <div className="flex flex-col items-center text-center sm:items-start sm:text-left">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#0B1F4D]/5 text-[#0B1F4D]">
              <Sparkles className="h-6 w-6" />
            </div>
            <h3 className="mt-4 font-semibold text-[#0B1F4D]">Une expérience premium</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Une vitrine pensée pour découvrir simplement les hôtels et leurs prestations.
            </p>
          </div>
        </div>
      </section>

      {/* Établissements à la une */}
      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#0B1F4D]">Établissements à la une</h2>
            <Link
              to="/hotel-vitrine/hotels"
              className="inline-flex items-center gap-1 text-sm font-medium text-[#0B1F4D] hover:underline"
            >
              Voir tout
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {isPending ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-80 rounded-2xl" />
              ))
            ) : featured.length > 0 ? (
              featured.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} />)
            ) : (
              <div className="col-span-full rounded-2xl border border-dashed border-black/10 bg-white p-12 text-center">
                <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
                <p className="mt-4 font-medium text-[#0B1F4D]">
                  Aucun établissement publié pour le moment
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Revenez bientôt — nos établissements partenaires seront bientôt visibles ici.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Search, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { HotelCard } from "@/components/hotel-vitrine/HotelCard";
import { fetchPublicHotels } from "@/integrations/hotel/public-directory";

export const Route = createFileRoute("/hotel-vitrine/hotels/")({
  validateSearch: (search: Record<string, unknown>): { q?: string } =>
    typeof search.q === "string" ? { q: search.q } : {},
  component: HotelVitrineCatalog,
});

function HotelVitrineCatalog() {
  const { q } = Route.useSearch();
  const [search, setSearch] = useState(q ?? "");
  const { data: hotels, isPending } = useQuery({
    queryKey: ["public-hotels"],
    queryFn: fetchPublicHotels,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const list = hotels ?? [];
    const term = search.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (hotel) =>
        hotel.name.toLowerCase().includes(term) ||
        (hotel.city ?? "").toLowerCase().includes(term),
    );
  }, [hotels, search]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#0B1F4D] sm:text-4xl">
          Nos établissements
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Parcourez les hôtels partenaires SAOVIA et trouvez votre prochain séjour.
        </p>
      </div>

      <div className="mx-auto mt-8 flex max-w-md items-center gap-2 rounded-xl border border-black/10 bg-white px-3 shadow-sm">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou ville…"
          className="border-0 shadow-none focus-visible:ring-0"
        />
      </div>

      <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {isPending ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-2xl" />)
        ) : filtered.length > 0 ? (
          filtered.map((hotel) => <HotelCard key={hotel.id} hotel={hotel} />)
        ) : (
          <div className="col-span-full rounded-2xl border border-dashed border-black/10 bg-white p-12 text-center">
            <Building2 className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="mt-4 font-medium text-[#0B1F4D]">
              {(hotels ?? []).length === 0
                ? "Aucun établissement publié pour le moment"
                : "Aucun établissement ne correspond à votre recherche"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {(hotels ?? []).length === 0
                ? "Revenez bientôt — nos établissements partenaires seront bientôt visibles ici."
                : "Essayez un autre nom ou une autre ville."}
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { supabase } from "@/integrations/supabase/client";
import { Users, Truck, Wrench, Wallet, ShoppingCart, FileText } from "lucide-react";
import { formatFCFA } from "@/lib/mms/format";

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) setSearch("");
  }, [open]);

  const { data } = useQuery({
    queryKey: ["global-search", search],
    enabled: open && search.trim().length > 0,
    queryFn: async () => {
      const term = `%${search.trim()}%`;
      const [clients, fournisseurs, services, ventes, achats, devis] = await Promise.all([
        supabase.from("clients").select("id, name").ilike("name", term).limit(5),
        supabase.from("fournisseurs").select("id, name").ilike("name", term).limit(5),
        supabase.from("services").select("id, name").ilike("name", term).limit(5),
        supabase
          .from("ventes")
          .select("id, client_name, number, total")
          .or(`client_name.ilike.${term},number.ilike.${term}`)
          .limit(5),
        supabase
          .from("achats")
          .select("id, fournisseur_name, number, total")
          .or(`fournisseur_name.ilike.${term},number.ilike.${term}`)
          .limit(5),
        supabase
          .from("devis")
          .select("id, client_name, number, total")
          .or(`client_name.ilike.${term},number.ilike.${term}`)
          .limit(5),
      ]);
      return {
        clients: clients.data ?? [],
        fournisseurs: fournisseurs.data ?? [],
        services: services.data ?? [],
        ventes: ventes.data ?? [],
        achats: achats.data ?? [],
        devis: devis.data ?? [],
      };
    },
  });

  const go = (route: string) => {
    onOpenChange(false);
    window.location.href = route;
  };

  const hasResults =
    data &&
    (data.clients.length ||
      data.fournisseurs.length ||
      data.services.length ||
      data.ventes.length ||
      data.achats.length ||
      data.devis.length);

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Rechercher un client, fournisseur, vente, achat, devis..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        {search.trim().length === 0 && (
          <CommandEmpty>Commencez à taper pour rechercher.</CommandEmpty>
        )}
        {search.trim().length > 0 && !hasResults && (
          <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>
        )}

        {!!data?.clients.length && (
          <CommandGroup heading="Clients">
            {data.clients.map((c) => (
              <CommandItem key={c.id} onSelect={() => go("/clients")}>
                <Users className="h-4 w-4 mr-2 text-primary" /> {c.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!!data?.fournisseurs.length && (
          <CommandGroup heading="Fournisseurs">
            {data.fournisseurs.map((f) => (
              <CommandItem key={f.id} onSelect={() => go("/fournisseurs")}>
                <Truck className="h-4 w-4 mr-2 text-primary" /> {f.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!!data?.services.length && (
          <CommandGroup heading="Services">
            {data.services.map((s) => (
              <CommandItem key={s.id} onSelect={() => go("/services")}>
                <Wrench className="h-4 w-4 mr-2 text-primary" /> {s.name}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!!data?.ventes.length && (
          <CommandGroup heading="Ventes">
            {data.ventes.map((v) => (
              <CommandItem key={v.id} onSelect={() => go("/ventes")}>
                <Wallet className="h-4 w-4 mr-2 text-primary" /> {v.number} —{" "}
                {v.client_name || "Client"} · {formatFCFA(Number(v.total))}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!!data?.achats.length && (
          <CommandGroup heading="Achats">
            {data.achats.map((a) => (
              <CommandItem key={a.id} onSelect={() => go("/achats")}>
                <ShoppingCart className="h-4 w-4 mr-2 text-primary" /> {a.number} —{" "}
                {a.fournisseur_name || "Fournisseur"} · {formatFCFA(Number(a.total))}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        {!!data?.devis.length && (
          <CommandGroup heading="Devis">
            {data.devis.map((d) => (
              <CommandItem key={d.id} onSelect={() => go("/devis")}>
                <FileText className="h-4 w-4 mr-2 text-primary" /> {d.number} —{" "}
                {d.client_name || "Client"} · {formatFCFA(Number(d.total))}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
      </CommandList>
    </CommandDialog>
  );
}

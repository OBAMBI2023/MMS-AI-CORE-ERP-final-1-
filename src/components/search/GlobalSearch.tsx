import { useState, useMemo } from "react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Users,
  Truck,
  Briefcase,
  Receipt,
  ShoppingCart,
  CreditCard,
  FileText,
  Settings,
  Loader2,
  Clock,
} from "lucide-react";
import { useGlobalSearch } from "@/hooks/useGlobalSearch";
import { SearchModule } from "@/types/search";

export function GlobalSearch({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { query, setQuery, results, isLoading, history, clearHistory } = useGlobalSearch();

  const iconMap: Record<SearchModule, JSX.Element> = {
    Clients: <Users className="h-4 w-4" />,
    Fournisseurs: <Truck className="h-4 w-4" />,
    Services: <Briefcase className="h-4 w-4" />,
    Ventes: <Receipt className="h-4 w-4" />,
    Achats: <ShoppingCart className="h-4 w-4" />,
    Charges: <CreditCard className="h-4 w-4" />,
    Devis: <FileText className="h-4 w-4" />,
    Paramètres: <Settings className="h-4 w-4" />,
  };

  const groupedResults = useMemo(() => {
    return results.reduce(
      (acc, result) => {
        // Normalize module to PascalCase to match SearchModule type
        const module = (result.module.charAt(0).toUpperCase() +
          result.module.slice(1).toLowerCase()) as SearchModule;
        if (!acc[module]) {
          acc[module] = [];
        }
        acc[module].push(result);
        return acc;
      },
      {} as Record<SearchModule, typeof results>,
    );
  }, [results]);

  const go = (url: string) => {
    onOpenChange(false);
    window.location.href = url;
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Rechercher dans tout l'ERP..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        {isLoading && (
          <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Recherche en cours...
          </div>
        )}
        {!isLoading && query.trim().length > 0 && results.length === 0 && (
          <CommandEmpty>Aucun résultat trouvé pour "{query}".</CommandEmpty>
        )}

        {!isLoading && query.trim().length === 0 && history.length > 0 && (
          <CommandGroup heading="Historique">
            {history.map((h) => (
              <CommandItem key={h} onSelect={() => setQuery(h)}>
                <Clock className="h-4 w-4 mr-2" /> {h}
              </CommandItem>
            ))}
            <CommandItem onSelect={clearHistory} className="text-destructive">
              Effacer l'historique
            </CommandItem>
          </CommandGroup>
        )}

        {Object.entries(groupedResults).map(([module, items]) => (
          <CommandGroup key={module} heading={module}>
            {items.map((item) => (
              <CommandItem key={item.id} onSelect={() => go(item.url)}>
                {iconMap[module as SearchModule] || <Users className="h-4 w-4" />}
                <span className="ml-2 font-medium">{item.title}</span>
                <span className="ml-2 text-muted-foreground text-xs">{item.description}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}

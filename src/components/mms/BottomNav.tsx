import { Home, Wallet, FileText, Receipt, Menu } from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

const items = [
  { icon: Home, label: "Accueil", to: "/app" },
  { icon: Wallet, label: "Ventes", to: "/ventes" },
  { icon: FileText, label: "Devis", to: "/devis" },
  { icon: Receipt, label: "Dépenses", to: "/depenses" },
] as const;

export function BottomNav({ onMenuClick }: { onMenuClick: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-around border-t border-border bg-card/95 px-1 pb-[env(safe-area-inset-bottom)] pt-1 backdrop-blur supports-[backdrop-filter]:bg-card/80 md:hidden">
      {items.map((it) => {
        const active = pathname === it.to;
        return (
          <Link
            key={it.to}
            to={it.to}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <it.icon className={cn("h-5 w-5", active && "text-primary")} />
            {it.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMenuClick}
        className="flex flex-1 flex-col items-center gap-0.5 rounded-xl py-2 text-[11px] font-medium text-muted-foreground transition-colors"
      >
        <Menu className="h-5 w-5" />
        Menu
      </button>
    </nav>
  );
}

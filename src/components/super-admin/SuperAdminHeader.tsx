import { Bell, ChevronDown, LogOut, Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { BrandLogo } from "@/components/branding/BrandLogo";
import { SuperAdminSidebar } from "@/components/super-admin/SuperAdminSidebar";

export function SuperAdminHeader({
  query,
  onQueryChange,
  onSignOut,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  onSignOut: () => Promise<void>;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur-xl">
      <div className="flex h-[72px] items-center justify-between gap-4 px-4 sm:px-6 xl:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0 rounded-xl lg:hidden">
                <Menu className="size-5" />
                <span className="sr-only">Ouvrir le menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] border-0 p-0 [&>button]:text-white">
              <SheetTitle className="sr-only">Navigation Super Admin</SheetTitle>
              <SuperAdminSidebar mobile />
            </SheetContent>
          </Sheet>
          <BrandLogo context="mobile" className="sm:hidden" />
          <div className="hidden min-w-0 sm:block">
            <h1 className="truncate text-base font-semibold tracking-tight">Vue d’ensemble</h1>
            <p className="truncate text-xs text-muted-foreground">
              Pilotage global de la plateforme SAOVIA
            </p>
          </div>
        </div>
        <div className="flex flex-1 items-center justify-end gap-2">
          <div className="relative hidden w-full max-w-sm md:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onFocus={() => (window.location.hash = "tenants")}
              placeholder="Rechercher un tenant, utilisateur ou module..."
              aria-label="Rechercher dans la plateforme"
              className="h-9 rounded-lg border-border bg-muted/40 pl-9 shadow-none"
            />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="relative rounded-lg text-muted-foreground"
            disabled
            title="Aucune notification configurée"
          >
            <Bell className="size-5" />
            <span className="sr-only">Notifications</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 gap-2 rounded-lg px-2">
                <span className="flex size-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-xs font-semibold text-white">
                  SA
                </span>
                <span className="hidden text-left md:block">
                  <span className="block text-xs font-medium">Super Admin</span>
                  <span className="block text-[10px] text-muted-foreground">Plateforme</span>
                </span>
                <ChevronDown className="hidden size-3.5 text-muted-foreground md:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-lg">
              <DropdownMenuLabel>Compte plateforme</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void onSignOut()}>
                <LogOut /> Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

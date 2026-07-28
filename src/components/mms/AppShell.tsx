import type { ReactNode } from "react";
import { Sidebar } from "@/components/mms/Sidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Sun, Moon } from "lucide-react";
import { SidebarContent } from "./SidebarContent";
import { useState } from "react";
import { UserMenu } from "./UserMenu";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useTheme } from "@/components/theme-provider";
import { PLATFORM_BRANDING } from "@/config/branding";
import { Skeleton } from "@/components/ui/skeleton";

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { settings, logoUrl, isLoading } = useCompanySettings();
  const companyName = settings?.company_name ?? "Mon Entreprise";

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="px-4 py-4 border-b border-border flex items-center justify-between gap-4 md:px-8 md:pt-6 md:pb-4">
          <div className="flex items-center gap-4">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[300px] p-0 bg-sidebar text-sidebar-foreground"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex flex-col h-full p-4 gap-2">
                  <div className="flex items-center gap-2 px-2 py-4">
                    <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl">
                      {isLoading ? (
                        <Skeleton className="h-10 w-10 rounded-xl" />
                      ) : logoUrl ? (
                        <img
                          src={logoUrl}
                          alt={`Logo ${companyName}`}
                          className="h-full w-full rounded-xl object-contain"
                        />
                      ) : (
                        <img
                          src={PLATFORM_BRANDING.assets.icon}
                          alt={PLATFORM_BRANDING.alt}
                          className="h-full w-full object-contain"
                        />
                      )}
                    </div>
                    <div className="min-w-0">
                      {isLoading ? (
                        <Skeleton className="h-4 w-28" />
                      ) : (
                        <div className="text-sm font-bold tracking-tight">{companyName}</div>
                      )}
                    </div>
                  </div>
                  <SidebarContent onItemClick={() => setOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <div>
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1 md:text-sm">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Activer le thème sombre" : "Activer le thème clair"}
              title={theme === "light" ? "Activer le thème sombre" : "Activer le thème clair"}
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <UserMenu />
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

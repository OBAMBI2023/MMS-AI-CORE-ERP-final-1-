import type { ReactNode } from "react";
import { Sidebar } from "@/components/mms/Sidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Bell, CalendarDays, Menu, Sun, Moon } from "lucide-react";
import { SidebarContent } from "./SidebarContent";
import { useState } from "react";
import { UserMenu } from "./UserMenu";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useTheme } from "@/components/theme-provider";
import { SidebarCompanyHeader } from "./SidebarCompanyHeader";
import { useTenant } from "@/providers/TenantProvider";
import { Hotel } from "lucide-react";

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
  const { logoUrl, isLoading } = useCompanySettings();
  const { tenant } = useTenant();
  const isHotel = tenant?.platform_type === "HOTEL";

  return (
    <div className={`flex h-screen w-full text-foreground ${isHotel ? "bg-[#F8F9FB] dark:bg-[#090F1D]" : "bg-background"}`}>
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <header className={`flex items-center justify-between gap-2 border-b px-4 py-4 sm:gap-4 md:px-8 ${isHotel ? "border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-white/10 dark:bg-[#0F172A]/90" : "border-border md:pb-4 md:pt-6"}`}>
          <div className="flex min-w-0 items-center gap-2 sm:gap-4">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[88vw] max-w-[360px] p-0 bg-sidebar text-sidebar-foreground"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-full flex-col gap-2">
                  <SidebarCompanyHeader
                    logoUrl={logoUrl}
                    isLoading={isLoading}
                  />
                  <div className="flex-1 px-4">
                    <SidebarContent onItemClick={() => setOpen(false)} />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <div className="hidden sm:block">
              {isHotel && <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400"><Hotel className="h-3.5 w-3.5" /> Hôtel &amp; Résidences</div>}
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
              {subtitle && (
                <p className="text-xs text-muted-foreground mt-1 md:text-sm">{subtitle}</p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            {isHotel && <div className="hidden items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500 lg:flex dark:border-white/10"><CalendarDays className="size-4 text-[#C9A227]" />{new Intl.DateTimeFormat("fr-FR", { weekday:"long", day:"numeric", month:"long" }).format(new Date())}</div>}
            {isHotel && <Button variant="ghost" size="icon" className="relative rounded-xl" aria-label="Notifications"><Bell className="h-5 w-5"/><span className="absolute right-2 top-2 size-1.5 rounded-full bg-[#C9A227]"/></Button>}
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
        <div className={`flex-1 overflow-y-auto p-4 md:p-8 ${isHotel ? "scrollbar-thin" : ""}`}>{children}</div>
      </main>
    </div>
  );
}

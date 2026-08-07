import type { ReactNode } from "react";
import { Sidebar } from "@/components/mms/Sidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Menu, Sun, Moon, Bell } from "lucide-react";
import { SidebarContent } from "./SidebarContent";
import { useState } from "react";
import { UserMenu } from "./UserMenu";
import { BottomNav } from "./BottomNav";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { useTheme } from "@/components/theme-provider";
import { SidebarCompanyHeader } from "./SidebarCompanyHeader";
import { cn } from "@/lib/utils";

export function AppShell({
  title,
  subtitle,
  actions,
  children,
  contentClassName,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { logoUrl, isLoading } = useCompanySettings();

  return (
    <div className="flex h-screen w-full bg-background text-foreground">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3.5 sm:gap-4 md:px-8 md:pb-4 md:pt-5">
          <div className="flex min-w-0 items-center gap-3 sm:gap-4">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="h-[100dvh] w-[82vw] max-w-[300px] overflow-hidden bg-sidebar p-0 text-sidebar-foreground [&>button]:right-3 [&>button]:top-3 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-full flex-col overflow-hidden">
                  <SidebarCompanyHeader
                    logoUrl={logoUrl}
                    isLoading={isLoading}
                    compact
                  />
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
                    <SidebarContent onItemClick={() => setOpen(false)} compact />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight sm:text-xl md:text-2xl">
                {title}
              </h1>
              {subtitle && (
                <p className="truncate text-xs text-muted-foreground mt-0.5 md:mt-1 md:text-sm">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            {actions && <div className="flex items-center gap-2 shrink-0 mr-1 sm:mr-2">{actions}</div>}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Activer le thème sombre" : "Activer le thème clair"}
              title={theme === "light" ? "Activer le thème sombre" : "Activer le thème clair"}
            >
              {theme === "light" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Notifications" title="Notifications">
                  <Bell className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72">
                <p className="text-sm font-semibold">Notifications</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Aucune nouvelle notification pour le moment.
                </p>
              </PopoverContent>
            </Popover>
            <div className="ml-1 sm:ml-1.5">
              <UserMenu />
            </div>
          </div>
        </header>
        <div
          className={cn(
            "flex-1 overflow-y-auto p-4 pb-20 md:p-8 md:pb-8",
            contentClassName,
          )}
        >
          {children}
        </div>
        <BottomNav onMenuClick={() => setOpen(true)} />
      </main>
    </div>
  );
}

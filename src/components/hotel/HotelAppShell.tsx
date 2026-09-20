import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Menu, Sun, Moon, Bell } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { UserMenu } from "@/components/mms/UserMenu";
import { cn } from "@/lib/utils";
import { HotelSidebar } from "./HotelSidebar";
import { HotelSidebarContent } from "./HotelSidebarContent";
import { HotelSidebarHeader } from "./HotelSidebarHeader";
import { HotelBottomNav } from "./HotelBottomNav";

export function HotelAppShell({
  title,
  subtitle,
  actions,
  mobileSubtitle,
  mobileActions,
  children,
  contentClassName,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  mobileSubtitle?: string;
  mobileActions?: ReactNode;
  children: ReactNode;
  contentClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    document.body.classList.add("hotel-theme");
    return () => {
      document.body.classList.remove("hotel-theme");
    };
  }, []);

  return (
    <div className="hotel-theme flex h-screen w-full overflow-x-hidden bg-background text-foreground">
      <HotelSidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-border/70 px-4 py-3.5 md:px-8 md:pb-4 md:pt-5">
          <div className="flex items-start gap-3 md:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="shrink-0" aria-label="Ouvrir le menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="hotel-theme h-[100dvh] w-[82vw] max-w-[300px] overflow-hidden bg-sidebar p-0 text-sidebar-foreground [&>button]:right-3 [&>button]:top-3 [&>button]:flex [&>button]:h-11 [&>button]:w-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full"
              >
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="flex h-full flex-col overflow-hidden">
                  <HotelSidebarHeader compact />
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] [-webkit-overflow-scrolling:touch]">
                    <HotelSidebarContent onItemClick={() => setOpen(false)} compact />
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <div className="min-w-0 flex-1 pt-0.5">
              <h1 className="truncate text-[1.05rem] font-bold tracking-tight text-foreground">
                {title}
              </h1>
              {mobileSubtitle ?? subtitle ? (
                <p className="mt-0.5 truncate text-[11px] leading-snug text-muted-foreground">
                  {mobileSubtitle ?? subtitle}
                </p>
              ) : null}
            </div>
            <div className="flex shrink-0 items-center gap-1">
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
              <div className="ml-1">
                <UserMenu />
              </div>
            </div>
          </div>
          <div className="mt-2 flex flex-col gap-2 md:hidden">
            {mobileActions && <div className="flex min-w-0 items-center justify-end gap-2">{mobileActions}</div>}
          </div>
          <div className="hidden items-center justify-between gap-3 md:flex">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight md:text-2xl">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-muted-foreground md:mt-1 md:truncate md:text-sm">
                  {subtitle}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
              {actions && <div className="mr-1 flex items-center gap-2 shrink-0">{actions}</div>}
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
              <div className="ml-1.5">
                <UserMenu />
              </div>
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
        <HotelBottomNav onMenuClick={() => setOpen(true)} />
      </main>
    </div>
  );
}

import type { ReactNode } from "react";
import { Sidebar } from "@/components/mms/Sidebar";
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Menu, Sparkles, Search } from "lucide-react";
import { SidebarContent } from "./SidebarContent";
import { useState, createContext, useContext, useEffect } from "react";
import { UserMenu } from "./UserMenu";
import { useCompanySettings } from "@/hooks/use-company-settings";

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  placeholder: string;
  setPlaceholder: (placeholder: string) => void;
  setVisible: (visible: boolean) => void;
}

const SearchContext = createContext<SearchContextType | null>(null);

export function useHeaderSearch(placeholderText?: string) {
  const context = useContext(SearchContext);
  if (!context) {
    throw new Error("useHeaderSearch must be used within a SearchProvider (AppShell)");
  }
  
  useEffect(() => {
    context.setVisible(true);
    if (placeholderText) {
      context.setPlaceholder(placeholderText);
    }
    return () => {
      context.setVisible(false);
    };
  }, [placeholderText, context]);

  return context;
}

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
  const { settings } = useCompanySettings();
  const companyName = settings?.company_name ?? "Mon Entreprise";
  const [searchQuery, setSearchQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("Rechercher...");
  const [searchVisible, setSearchVisible] = useState(false);

  // Reset search query on title change to prevent search states carrying over
  useEffect(() => {
    setSearchQuery("");
  }, [title]);

  return (
    <SearchContext.Provider
      value={{
        searchQuery,
        setSearchQuery,
        placeholder,
        setPlaceholder,
        setVisible: setSearchVisible,
      }}
    >
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
                      <div className="grid place-items-center h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-lg shadow-primary/30">
                        <Sparkles className="h-5 w-5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-bold tracking-tight">{companyName}</div>
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
              {searchVisible && (
                <div className="relative w-[160px] sm:w-[240px] md:w-[320px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-xl bg-muted/60 border border-border pl-10 pr-4 py-2 text-xs sm:text-sm outline-none focus:border-primary/40 transition-all duration-200"
                  />
                </div>
              )}
              <UserMenu />
              {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
            </div>
          </header>
          <div className="flex-1 overflow-y-auto p-4 md:p-8">{children}</div>
        </main>
      </div>
    </SearchContext.Provider>
  );
}

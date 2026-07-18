import { motion } from "framer-motion";
import { Sparkles, Building2 } from "lucide-react";
import { SidebarContent } from "./SidebarContent";
import { useCompanySettings } from "@/hooks/use-company-settings";

export function Sidebar() {
  const { logoUrl, settings } = useCompanySettings();

  return (
    <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground p-4 gap-2 border-r border-sidebar-border">
      <div className="flex items-center gap-2 px-2 py-4">
        <div className="grid place-items-center h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-lg shadow-primary/30 overflow-hidden">
          {logoUrl ? (
            <img src={logoUrl} alt="logo" className="h-full w-full object-cover rounded-2xl" />
          ) : (
            <Sparkles className="h-5 w-5 text-white" />
          )}
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold tracking-tight">MMS ERP</div>
          <div className="text-xs text-sidebar-foreground/60">Maguy Multi Services</div>
        </div>
      </div>

      <SidebarContent />

      <div className="mt-auto rounded-2xl bg-sidebar-accent/60 p-3 border border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary-glow grid place-items-center text-white text-sm font-bold">
            B
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium truncate">Bamba</div>
            <div className="text-xs text-sidebar-foreground/60 truncate">Administrateur</div>
          </div>
        </div>
      </div>
    </aside>
  );
}

import { motion } from "framer-motion";
import { Sparkles, Building2 } from "lucide-react";
import { SidebarContent } from "./SidebarContent";
import { useCompanySettings } from "@/hooks/use-company-settings";

export function Sidebar() {
  const { logoUrl, settings } = useCompanySettings();
  const companyName = settings?.company_name ?? "Mon Entreprise";

  return (
    <aside className="hidden md:flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden">
      <div className="p-4">
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="grid place-items-center h-10 w-10 rounded-2xl bg-gradient-to-br from-primary to-primary-glow shadow-lg shadow-primary/30 overflow-hidden">
            {logoUrl ? (
              <img src={logoUrl} alt="logo" className="h-full w-full object-cover rounded-2xl" />
            ) : (
              <Sparkles className="h-5 w-5 text-white" />
            )}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold tracking-tight">{companyName}</div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4">
        <SidebarContent />
      </div>
    </aside>
  );
}

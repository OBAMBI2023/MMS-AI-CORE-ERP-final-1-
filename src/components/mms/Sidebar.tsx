import { SidebarContent } from "./SidebarContent";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { SidebarCompanyHeader } from "./SidebarCompanyHeader";

export function Sidebar() {
  const { logoUrl, isLoading } = useCompanySettings();

  return (
    <aside className="hidden md:flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden">
      <SidebarCompanyHeader
        logoUrl={logoUrl}
        isLoading={isLoading}
      />

      <div className="flex-1 px-4">
        <SidebarContent />
      </div>
    </aside>
  );
}

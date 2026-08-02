import { SidebarContent } from "./SidebarContent";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { SidebarCompanyHeader } from "./SidebarCompanyHeader";
import { useTenant } from "@/providers/TenantProvider";

export function Sidebar() {
  const { logoUrl, isLoading } = useCompanySettings();
  const { tenant } = useTenant();
  const isHotel = tenant?.platform_type === "HOTEL";

  return (
    <aside className={`hidden md:flex h-full w-64 shrink-0 flex-col text-sidebar-foreground border-r border-sidebar-border overflow-hidden ${isHotel ? "bg-[#0F172A]" : "bg-sidebar"}`}>
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

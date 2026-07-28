import { SidebarContent } from "./SidebarContent";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { PLATFORM_BRANDING } from "@/config/branding";
import { Skeleton } from "@/components/ui/skeleton";

export function Sidebar() {
  const { logoUrl, settings, isLoading } = useCompanySettings();
  const companyName = settings?.company_name ?? "Mon Entreprise";

  return (
    <aside className="hidden md:flex h-full w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border overflow-hidden">
      <div className="p-4">
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
      </div>

      <div className="flex-1 px-4">
        <SidebarContent />
      </div>
    </aside>
  );
}

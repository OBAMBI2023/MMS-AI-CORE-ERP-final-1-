import { BrandLogo } from "@/components/branding/BrandLogo";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTenant } from "@/providers/TenantProvider";
import { useCompanySettings } from "@/hooks/use-company-settings";
import { cn } from "@/lib/utils";

type SidebarCompanyHeaderProps = {
  logoUrl?: string | null;
  isLoading?: boolean;
  collapsed?: boolean;
  className?: string;
};

function tenantText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function shortBusinessActivity(value: unknown) {
  const activity = tenantText(value);
  const [shortActivity] = activity.split(/\s+(?:et|&)\s+/i);

  return shortActivity || activity;
}

export function SidebarCompanyHeader({
  logoUrl,
  isLoading = false,
  collapsed = false,
  className,
}: SidebarCompanyHeaderProps) {
  const { tenant, loading: tenantLoading } = useTenant();
  const { settings, isLoading: settingsLoading } = useCompanySettings();
  const loading = isLoading || tenantLoading || settingsLoading;
  const companyName = tenantText(tenant?.name);
  const businessActivity =
    shortBusinessActivity(settings?.business_sector) || "Secteur non renseigné";

  const logo = loading ? (
    <Skeleton className="size-16 shrink-0 rounded-2xl" />
  ) : (
    <BrandLogo
      context="sidebar"
      src={logoUrl}
      alt={companyName ? `Logo ${companyName}` : "Logo de l’entreprise"}
      className="size-16 rounded-2xl bg-white p-[2px] shadow-[0_6px_18px_rgba(15,23,42,0.18)]"
      imageClassName="size-[90%]"
    />
  );

  if (collapsed) {
    return (
      <TooltipProvider delayDuration={200}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex h-[100px] shrink-0 items-center justify-center border-b border-[rgba(255,255,255,0.08)] px-2",
                className,
              )}
            >
              {logo}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-64">
            <p className="font-semibold">{companyName}</p>
            <p className="text-xs opacity-80">{businessActivity}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={cn(
        "flex h-[100px] shrink-0 items-center gap-4 border-b border-[rgba(255,255,255,0.08)] px-4",
        className,
      )}
    >
      {logo}
      <div className="min-w-0 flex-1">
        {loading ? (
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-[22px] w-full max-w-32" />
            <Skeleton className="h-[16px] w-full max-w-24" />
          </div>
        ) : (
          <>
            <p className="line-clamp-2 text-[18px] font-bold leading-[22px] text-white">
              {companyName}
            </p>
            <p
              className="mt-1 truncate text-[13px] leading-[18px] text-[#A8B3CF]"
              title={businessActivity}
            >
              {businessActivity}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

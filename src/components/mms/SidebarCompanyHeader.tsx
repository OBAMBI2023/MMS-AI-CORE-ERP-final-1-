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
  compact?: boolean;
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
  compact = false,
  className,
}: SidebarCompanyHeaderProps) {
  const { tenant, loading: tenantLoading } = useTenant();
  const { settings, isLoading: settingsLoading } = useCompanySettings();
  const loading = isLoading || tenantLoading || settingsLoading;
  const companyName = tenantText(tenant?.name);
  const businessActivity =
    shortBusinessActivity(settings?.business_sector) || "Secteur non renseigné";

  const logoSizeClass = compact ? "size-11" : "size-16";
  const logo = loading ? (
    <Skeleton className={cn(logoSizeClass, "shrink-0 rounded-2xl")} />
  ) : (
    <BrandLogo
      context="sidebar"
      src={logoUrl}
      alt={companyName ? `Logo ${companyName}` : "Logo de l’entreprise"}
      className={cn(logoSizeClass, "rounded-2xl bg-white p-[2px] shadow-[0_6px_18px_rgba(15,23,42,0.18)]")}
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
        "flex shrink-0 items-center border-b border-[rgba(255,255,255,0.08)]",
        compact ? "h-[68px] gap-3 px-4" : "h-[100px] gap-4 px-4",
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
            <p
              className={cn(
                "line-clamp-2 font-bold text-white",
                compact ? "text-[15px] leading-[18px]" : "text-[18px] leading-[22px]",
              )}
            >
              {companyName}
            </p>
            <p
              className={cn(
                "truncate text-[#A8B3CF]",
                compact ? "mt-0.5 text-[11px] leading-[14px]" : "mt-1 text-[13px] leading-[18px]",
              )}
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

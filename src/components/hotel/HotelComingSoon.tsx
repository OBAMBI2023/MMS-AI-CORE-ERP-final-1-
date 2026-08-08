import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { HotelAppShell } from "./HotelAppShell";

export function HotelComingSoon({
  title,
  subtitle = "SAOVIA HOTEL",
  icon: Icon,
  description,
}: {
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  description: string;
}) {
  return (
    <HotelAppShell title={title} subtitle={subtitle} contentClassName="bg-[#F4FAF8] dark:bg-[#07211C]">
      <Card className="flex flex-col items-center justify-center rounded-[24px] px-6 py-16 text-center dark:bg-[#0F2E28] dark:border-white/5">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-primary/10 text-primary mb-4">
          <Icon className="h-7 w-7" />
        </div>
        <h2 className="text-lg font-bold">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
        <span className="mt-5 inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          Module en cours de construction
        </span>
      </Card>
    </HotelAppShell>
  );
}

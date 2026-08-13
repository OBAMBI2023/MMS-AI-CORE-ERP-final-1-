import type { ComponentType, ReactNode } from "react";
import { cn } from "@/lib/utils";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

type HotelDialogSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<HotelDialogSize, string> = {
  sm: "sm:max-w-md",
  md: "sm:max-w-xl",
  lg: "sm:max-w-2xl",
  xl: "sm:max-w-4xl",
};

export function HotelDialogContent({
  size = "md",
  className,
  children,
}: {
  size?: HotelDialogSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <DialogContent
      className={cn(
        "hotel-theme flex w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] flex-col gap-0 overflow-hidden rounded-2xl border border-border bg-background p-0 shadow-2xl shadow-black/20 sm:w-full",
        SIZE_CLASSES[size],
        className,
      )}
    >
      {children}
    </DialogContent>
  );
}

export function HotelDialogHeader({
  title,
  description,
  icon: Icon,
  className,
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  icon?: ComponentType<{ className?: string }>;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <DialogHeader className={cn("shrink-0 border-b border-border/70 px-4 py-4 sm:px-6 sm:py-6", className)}>
      <div className="flex items-start gap-3 pr-10">
        {Icon ? (
          <div className="grid size-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-5" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <DialogTitle className="text-lg font-semibold text-foreground">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="mt-1 text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          ) : null}
        </div>
      </div>
      {children}
    </DialogHeader>
  );
}

export function HotelDialogBody({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6", className)}>{children}</div>;
}

export function HotelDialogFooter({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <DialogFooter className={cn("shrink-0 border-t border-border/70 px-4 py-4 sm:px-6 sm:py-5", className)}>
      {children}
    </DialogFooter>
  );
}

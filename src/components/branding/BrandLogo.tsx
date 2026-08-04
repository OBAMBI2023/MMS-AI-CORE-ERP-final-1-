import type { ImgHTMLAttributes } from "react";
import { PLATFORM_BRANDING } from "@/config/branding";
import { cn } from "@/lib/utils";

export type BrandLogoContext =
  | "sidebar"
  | "header"
  | "login"
  | "superAdmin"
  | "partner"
  | "dashboard"
  | "pdf"
  | "mobile";

const contextClasses: Record<BrandLogoContext, string> = {
  sidebar: "size-9 md:size-10",
  header: "size-14 md:size-16",
  login: "size-[72px] sm:size-20 lg:size-24",
  superAdmin: "size-12 md:size-14",
  partner: "size-12 md:size-14",
  dashboard: "size-10 md:size-12",
  pdf: "size-8 md:size-10",
  mobile: "size-8 sm:size-10",
};

type BrandLogoProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  context?: BrandLogoContext;
  src?: string | null;
  imageClassName?: string;
};

/**
 * Canonical logo renderer. The fixed aspect-ratio safety box prevents layout
 * shifts while object-contain guarantees that platform and tenant logos keep
 * their original proportions.
 */
export function BrandLogo({
  context = "dashboard",
  src,
  alt = PLATFORM_BRANDING.alt,
  className,
  imageClassName,
  loading = "eager",
  decoding = "async",
  ...props
}: BrandLogoProps) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden p-1",
        contextClasses[context],
        className,
      )}
    >
      <img
        src={src || PLATFORM_BRANDING.assets.logo}
        alt={alt}
        loading={loading}
        decoding={decoding}
        draggable={false}
        className={cn("block h-full w-full object-contain object-center", imageClassName)}
        {...props}
      />
    </span>
  );
}

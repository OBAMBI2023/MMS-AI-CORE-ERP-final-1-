import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useLocation,
  useNavigate,
  useRouter,
  HeadContent,
  Scripts,
  redirect,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { Toaster } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getRouteModule } from "@/lib/route-modules";
import { ThemeProvider } from "@/components/theme-provider";
import { TenantProvider } from "@/providers/TenantProvider";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { getPlatformAdminAccess } from "@/lib/super-admin.server";
import { getPartnerAdminAccess } from "@/lib/partner-admin.server";
import { PLATFORM_BRANDING } from "@/config/branding";
import { readEnvVar } from "@/integrations/supabase/env";
import { readRecoveryCallback } from "@/integrations/supabase/password-recovery-callback";
import { isRecoveryRouteAllowed } from "@/integrations/supabase/password-recovery-callback";
import { hasPasswordRecoveryContext } from "@/integrations/supabase/password-recovery";
import { getTenantRouteAccess } from "@/lib/tenant-route-access.server";

function getSiteOrigin() {
  const browserOrigin = typeof window !== "undefined" ? window.location.origin : undefined;
  const configuredOrigin = readEnvVar(
    "VITE_SITE_URL",
    "SITE_URL",
    "URL",
    "DEPLOY_URL",
    "CF_PAGES_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
    "VERCEL_URL",
  );
  const candidate = browserOrigin ?? configuredOrigin ?? "http://localhost";
  const absoluteCandidate = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;

  try {
    return new URL(absoluteCandidate).origin;
  } catch {
    return "http://localhost";
  }
}

const socialLogoUrl = new URL(PLATFORM_BRANDING.assets.logo, `${getSiteOrigin()}/`).toString();

function isPlatformRoute(pathname: string) {
  return pathname === "/super-admin" || pathname.startsWith("/super-admin/");
}

function isPartnerRoute(pathname: string) {
  return pathname === "/partner" || pathname.startsWith("/partner/");
}

function isLicenseRoute(pathname: string) {
  return pathname === "/licence" || pathname === "/abonnement-expire";
}

function isPendingRoute(pathname: string) {
  return pathname === "/demande-en-attente";
}

const publicRoutes = new Set([
  "/",
  "/fonctionnalites",
  "/tarifs",
  "/demo",
  "/essai-gratuit",
  "/login",
  "/forgot-password",
  "/reset-password",
]);

function isPublicRoute(pathname: string) {
  return publicRoutes.has(pathname);
}

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "Une erreur inattendue empêche le chargement de cette page."}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

const ACCESS_STALE_TIME = 60_000;

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location, context }) => {
    if (typeof window === "undefined") {
      return;
    }

    // Supabase can consume an implicit hash as soon as its client is created.
    // Move the untouched callback to its only authorized route first.
    if (location.pathname !== "/reset-password" && readRecoveryCallback(window.location.href)) {
      const target = `/reset-password${window.location.search}${window.location.hash}`;
      window.location.replace(target);
      return;
    }

    if (hasPasswordRecoveryContext() && !isRecoveryRouteAllowed(location.pathname)) {
      throw redirect({ to: "/reset-password" });
    }

    // The reset page exclusively owns callback consumption. In particular, do
    // not exchange or clean its one-time code/hash in the root guard.
    if (location.pathname === "/reset-password") {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (isPublicRoute(location.pathname)) {
      return;
    }

    if (!session) {
      throw redirect({ to: "/login" });
    }

    if (isPendingRoute(location.pathname)) return;

    if (session) {
      // La qualité de compte plateforme est vérifiée côté serveur avant toute
      // lecture de profil, de tenant ou de permission RBAC.
      const identityKey = session.user.id;
      const { isPlatformAdmin } = await context.queryClient.ensureQueryData({
        queryKey: ["route-access", identityKey, "platform-admin"],
        queryFn: getPlatformAdminAccess,
        staleTime: ACCESS_STALE_TIME,
      });
      if (isPlatformAdmin) {
        const catalogTenantId = new URLSearchParams(location.searchStr).get("tenantId");
        const isTenantCatalogView =
          location.pathname === "/settings/catalogue" &&
          Boolean(catalogTenantId) &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            catalogTenantId!,
          );
        if (!isPlatformRoute(location.pathname) && !isTenantCatalogView) {
          throw redirect({ to: "/super-admin" });
        }
        return;
      }

      const { isPartnerAdmin } = await context.queryClient.ensureQueryData({
        queryKey: ["route-access", identityKey, "partner-admin"],
        queryFn: getPartnerAdminAccess,
        staleTime: ACCESS_STALE_TIME,
      });
      if (isPartnerAdmin) {
        if (!isPartnerRoute(location.pathname)) {
          throw redirect({ to: "/partner" });
        }
        return;
      }

      if (isPlatformRoute(location.pathname)) {
        throw redirect({ to: "/403" });
      }

      if (isPartnerRoute(location.pathname)) {
        throw redirect({ to: "/403" });
      }

      if (isLicenseRoute(location.pathname)) {
        return;
      }

      const tenantAccess = await context.queryClient.ensureQueryData({
        queryKey: ["route-access", identityKey, "tenant", location.pathname],
        queryFn: () => getTenantRouteAccess({ data: { pathname: location.pathname } }),
        staleTime: ACCESS_STALE_TIME,
      });
      if (!tenantAccess.allowed) {
        if (tenantAccess.reason === "license") {
          throw redirect({ to: "/abonnement-expire" });
        }
        if (["profile", "tenant", "license", "role"].includes(tenantAccess.reason)) {
          throw redirect({ to: "/demande-en-attente" });
        }
        throw redirect({ to: "/403" });
      }

      const isHotelPath =
        location.pathname === "/hotel" ||
        location.pathname.startsWith("/hotel/") ||
        location.pathname === "/depenses";
      if (tenantAccess.platformType === "HOTEL" && !isHotelPath) {
        throw redirect({ to: "/hotel" });
      }
      if (tenantAccess.platformType === "ERP" && location.pathname.startsWith("/hotel")) {
        throw redirect({ to: "/app" });
      }

      const requiredModule = getRouteModule(location.pathname);
      if (requiredModule) {
        const { moduleEnabled, moduleError } = await context.queryClient.ensureQueryData({
          queryKey: ["route-access", identityKey, "module", requiredModule],
          queryFn: async () => {
            const { data, error } = await supabase.rpc("current_user_module_enabled", {
              requested_code: requiredModule,
            });
            return { moduleEnabled: data, moduleError: error };
          },
          // Module assignments can be changed while the tenant is connected.
          // Recheck on every direct navigation instead of trusting the access cache.
          staleTime: 0,
        });
        if (moduleError || !moduleEnabled) {
          throw redirect({ to: "/403" });
        }
      }

      if (["/stock", "/achats", "/fournisseurs"].includes(location.pathname)) {
        const { catalogRouteAllowed, catalogRouteError } = await context.queryClient.ensureQueryData({
          queryKey: ["route-access", identityKey, "catalog", location.pathname],
          queryFn: async () => {
            const { data, error } = await supabase.rpc("current_user_catalog_route_enabled", {
              requested_path: location.pathname,
            });
            return { catalogRouteAllowed: data, catalogRouteError: error };
          },
          staleTime: ACCESS_STALE_TIME,
        });
        if (catalogRouteError || !catalogRouteAllowed) {
          throw redirect({ to: "/403" });
        }
      }

      // The server decision already checked the permission against the
      // tenant-scoped role; repeating it here caused two extra reads.
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: PLATFORM_BRANDING.name },
      {
        name: "description",
        content:
          PLATFORM_BRANDING.description,
      },
      { property: "og:title", content: PLATFORM_BRANDING.name },
      {
        property: "og:description",
        content:
          PLATFORM_BRANDING.description,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: PLATFORM_BRANDING.name,
      },
      {
        name: "twitter:description",
        content:
          PLATFORM_BRANDING.description,
      },
      {
        property: "og:image",
        content: socialLogoUrl,
      },
      {
        name: "twitter:image",
        content: socialLogoUrl,
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: PLATFORM_BRANDING.assets.favicon, type: "image/svg+xml", sizes: "32x32" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="fr">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { DynamicFavicon } from "@/components/mms/DynamicFavicon";

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const navigate = useNavigate();
  const isPlatformArea = useLocation({
    select: (location) =>
      isPlatformRoute(location.pathname) || isPartnerRoute(location.pathname),
  });
  const isPublicArea = useLocation({
    select: (location) => isPublicRoute(location.pathname) || isPendingRoute(location.pathname),
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (["SIGNED_OUT", "USER_UPDATED"].includes(event)) {
        // A user metadata update may represent a real tenant switch. Clear all
        // cached tenant data so no query without a tenant key can leak across.
        queryClient.clear();
      }
      if (event === "SIGNED_OUT" && !isPublicRoute(window.location.pathname)) {
        navigate({ to: "/login", replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, queryClient]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        {isPlatformArea || isPublicArea ? (
          <>
            <DynamicFavicon platform />
            <Outlet />
            <Toaster richColors position="top-right" />
          </>
        ) : (
          <TenantProvider>
            <DynamicFavicon />
            <Outlet />
            <Toaster richColors position="top-right" />
          </TenantProvider>
        )}
      </ThemeProvider>
    </QueryClientProvider>
  );
}

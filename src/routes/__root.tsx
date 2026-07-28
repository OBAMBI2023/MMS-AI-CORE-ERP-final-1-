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
import { hasPermission } from "@/lib/auth";
import { routePermissions } from "@/lib/route-permissions";
import { getRouteModule } from "@/lib/route-modules";
import { ThemeProvider } from "@/components/theme-provider";
import { TenantProvider } from "@/providers/TenantProvider";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { getPlatformAdminAccess } from "@/lib/super-admin.server";
import { getPartnerAdminAccess } from "@/lib/partner-admin.server";
import { PLATFORM_BRANDING } from "@/config/branding";
import { readEnvVar } from "@/integrations/supabase/env";

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
  const candidate = browserOrigin ?? configuredOrigin ?? "http://localhost:3000";
  const absoluteCandidate = /^https?:\/\//i.test(candidate) ? candidate : `https://${candidate}`;

  try {
    return new URL(absoluteCandidate).origin;
  } catch {
    return "http://localhost:3000";
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
  return pathname === "/licence";
}

const publicRoutes = new Set([
  "/",
  "/fonctionnalites",
  "/tarifs",
  "/demo",
  "/essai-gratuit",
  "/login",
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
          Something went wrong on our end. You can try refreshing or head back home.
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

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  beforeLoad: async ({ location }) => {
    if (typeof window === "undefined") {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log("DEBUG: beforeLoad session check:", {
      path: location.pathname,
      session: !!session,
    });

    if (isPublicRoute(location.pathname)) {
      return;
    }

    if (!session) {
      throw redirect({ to: "/login" });
    }

    if (session) {
      // La qualité de compte plateforme est vérifiée côté serveur avant toute
      // lecture de profil, de tenant ou de permission RBAC.
      const { isPlatformAdmin } = await getPlatformAdminAccess();
      if (isPlatformAdmin) {
        if (!isPlatformRoute(location.pathname)) {
          throw redirect({ to: "/super-admin" });
        }
        return;
      }

      const { isPartnerAdmin } = await getPartnerAdminAccess();
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

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("tenant_id")
        .eq("id", session.user.id)
        .single();

      if (profileError || !profile?.tenant_id) {
        throw redirect({ to: "/licence" });
      }

      const { data: subscription, error: subscriptionError } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("tenant_id", profile.tenant_id)
        .maybeSingle();

      const subscriptionStatus = subscription ? String(subscription.status) : null;
      const hasValidLicense = subscriptionStatus === "active" || subscriptionStatus === "trial";

      if (subscriptionError || !hasValidLicense) {
        throw redirect({ to: "/licence" });
      }

      const requiredModule = getRouteModule(location.pathname);
      if (requiredModule) {
        const { data: moduleEnabled, error: moduleError } = await supabase.rpc(
          "current_user_module_enabled",
          { requested_code: requiredModule },
        );
        if (moduleError || !moduleEnabled) {
          throw redirect({ to: "/403" });
        }
      }

      const requiredPermission = routePermissions[location.pathname];
      if (requiredPermission) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("roles(name)")
          .eq("id", session.user.id)
          .single();

        const roleName = profile?.roles?.name;

        // Logic fix:
        // Use the new permission-based check to verify if the user has the required permission.
        // Admins are always authorized.
        let isAuthorized = roleName === "Administrateur";
        if (!isAuthorized) {
          isAuthorized = await hasPermission(session.user.id, requiredPermission);
        }

        if (!isAuthorized) {
          console.log("DEBUG: Access denied for", {
            role: roleName,
            path: location.pathname,
            requiredPermission,
          });
          // Ne pas renvoyer vers le Dashboard : un rôle sans dashboard.view
          // y serait immédiatement refusé et provoquerait une boucle.
          throw redirect({ to: "/403" });
        }
      }
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
      { rel: "icon", href: PLATFORM_BRANDING.assets.favicon, type: "image/svg+xml" },
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
    select: (location) => isPublicRoute(location.pathname),
  });

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !isPublicRoute(window.location.pathname)) {
        navigate({ to: "/login", replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

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

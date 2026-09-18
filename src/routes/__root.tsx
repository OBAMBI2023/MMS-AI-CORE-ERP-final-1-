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
import {
  isAdminOnlyRoute,
  isAdministratorRole,
  isErpParametresRoute,
  isHotelSettingsRoute,
} from "@/lib/route-permissions";
import { getRouteModule } from "@/lib/route-modules";
import { ThemeProvider } from "@/components/theme-provider";
import { TenantProvider } from "@/providers/TenantProvider";
import { captureError, identify, initializeAnalytics, pageView, resetAnalytics, setUserContext, track } from "@/lib/analytics";
import { analyticsEvents } from "@/lib/analytics";
import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { getPlatformAdminAccess } from "@/lib/super-admin.server";
import { getPartnerAdminAccess } from "@/lib/partner-admin.server";
import { PLATFORM_BRANDING } from "@/config/branding";
import { readEnvVar } from "@/integrations/supabase/env";
import { handleSupabaseAuthCallback } from "@/integrations/supabase/password-recovery";

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

function isHotelRoute(pathname: string) {
  return pathname === "/hotel" || pathname.startsWith("/hotel/");
}

// Le namespace Restaurant a son propre système d'authentification
// (restaurantSupabase / RestaurantProtectedRoute) et ne doit jamais dépendre
// d'une session ERP/Hôtel : le guard global ci-dessous le laisse passer
// entièrement, y compris les futures sous-routes (/restaurant/commandes,
// /restaurant/menus, ...).
function isRestaurantRoute(pathname: string) {
  return pathname === "/restaurant" || pathname.startsWith("/restaurant/");
}

// Vitrine publique de commande d'un restaurant (/r/:tenantSlug). Entièrement
// anonyme (aucune session ERP/Hôtel ni Restaurant admin requise) : le tenant
// est résolu depuis le slug de l'URL via restaurantSupabase, jamais depuis
// une session.
function isPublicOrderingRoute(pathname: string) {
  return pathname === "/r" || pathname.startsWith("/r/");
}

// Vitrine publique SAOVIA Hôtel (/sitevitrine, /sitevitrine/hotels,
// /sitevitrine/hotels/:slug). Entièrement anonyme, sans rapport avec le
// back-office /hotel/* (qui reste protégé par la garde ci-dessous) : chaque
// tenant est résolu depuis son slug public, jamais depuis une session.
function isHotelVitrineRoute(pathname: string) {
  return pathname === "/sitevitrine" || pathname.startsWith("/sitevitrine/");
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
  "/preview-achats",
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

    // Supabase may return recovery credentials on the configured Site URL
    // (including in the hash). Normalize every recovery callback before the
    // regular public/authenticated route guards can redirect elsewhere.
    const callbackKind = await handleSupabaseAuthCallback();
    if (callbackKind === "recovery" && location.pathname !== "/reset-password") {
        throw redirect({ to: "/reset-password" });
    }

    if (callbackKind) {
      return;
    }

    const {
      data: { session },
    } = await supabase.auth.getSession();

    console.log("DEBUG: beforeLoad session check:", {
      path: location.pathname,
      session: !!session,
    });

    if (
      isPublicRoute(location.pathname) ||
      isRestaurantRoute(location.pathname) ||
      isPublicOrderingRoute(location.pathname) ||
      isHotelVitrineRoute(location.pathname)
    ) {
      return;
    }

    if (!session) {
      throw redirect({ to: "/login" });
    }

    if (session) {
      // La qualité de compte plateforme (Super Admin) et Partner est vérifiée
      // côté serveur avant toute lecture de profil, de tenant ou de
      // permission RBAC. Les deux appels sont indépendants l'un de l'autre
      // (aucun ne dépend du résultat de l'autre) : ils sont parallélisés pour
      // éviter un waterfall réseau séquentiel sur chaque navigation.
      const [{ isPlatformAdmin }, { isPartnerAdmin }] = await Promise.all([
        getPlatformAdminAccess(),
        getPartnerAdminAccess(),
      ]);

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
        .select("tenant_id, status")
        .eq("id", session.user.id)
        .single();

      if (
        profileError ||
        !profile?.tenant_id ||
        profile.status === "suspended" ||
        profile.status === "suspendu"
      ) {
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

      // Paramètres ERP (/parametres) et Paramètres Hôtel (/hotel/parametres)
      // sont deux interfaces distinctes qui ne doivent jamais se substituer
      // l'une à l'autre. Le choix dépend uniquement de tenants.platform_type
      // du tenant courant, jamais du rôle de l'utilisateur ni de la manière
      // dont la route a été atteinte (sidebar, menu compte, lien direct...).
      const { data: tenantRow } = await supabase
        .from("tenants")
        .select("platform_type")
        .eq("id", profile.tenant_id)
        .maybeSingle();
      const platformType = tenantRow?.platform_type ?? null;

      if (platformType === "HOTEL" && isErpParametresRoute(location.pathname)) {
        throw redirect({ to: "/hotel/parametres" });
      }

      if (platformType === "ERP" && isHotelSettingsRoute(location.pathname)) {
        throw redirect({ to: "/parametres" });
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

      if (["/stock", "/achats", "/fournisseurs"].includes(location.pathname)) {
        const { data: catalogRouteAllowed, error: catalogRouteError } = await supabase.rpc(
          "current_user_catalog_route_enabled",
          { requested_path: location.pathname },
        );
        if (catalogRouteError || !catalogRouteAllowed) {
          throw redirect({ to: "/403" });
        }
      }

      // Le module Hôtel est réservé aux tenants platform_type='HOTEL' ayant le
      // pack Hôtel actif. hotel_module_enabled() applique déjà cette double
      // condition côté RLS pour les tables hotel_*, on la réutilise ici pour
      // garder /hotel et toutes ses sous-routes cohérentes avec l'accès aux
      // données qu'elles affichent.
      if (isHotelRoute(location.pathname)) {
        const { data: hotelAccessEnabled, error: hotelAccessError } = await supabase.rpc(
          "hotel_module_enabled",
          { code: "hotel_dashboard" },
        );
        if (hotelAccessError || !hotelAccessEnabled) {
          throw redirect({ to: "/403" });
        }
      }

      // /hotel/parametres est gouverné par la permission RBAC
      // hotel.settings.view, pas par le nom du rôle : un rôle secondaire
      // (ex: "Gérant") peut légitimement s'être vu attribuer cette
      // permission pour le tenant. public.has_permission() inclut déjà le
      // bypass Administrateur (public.is_admin()) et applique l'isolation
      // tenant (public.current_tenant_id()), donc ce contrôle reste
      // équivalent à la RLS qui protège les données affichées par la page.
      if (isHotelSettingsRoute(location.pathname)) {
        const { data: allowed, error: permissionError } = await supabase.rpc("has_permission", {
          required_permission: "hotel.settings.view",
        });

        if (permissionError || !allowed) {
          throw redirect({ to: "/403" });
        }
      }

      // Paramètres et gestion des utilisateurs (ERP) restent exclusifs à
      // l'Administrateur. Tout autre module métier actif du tenant est
      // ouvert à tout rôle secondaire (cf. le contrôle de module actif
      // ci-dessus, qui s'applique déjà à cette route).
      if (isAdminOnlyRoute(location.pathname)) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("roles(name)")
          .eq("id", session.user.id)
          .single();

        const roleName = profile?.roles?.name ?? null;

        if (!isAdministratorRole(roleName)) {
          console.log("DEBUG: Access denied for", {
            role: roleName,
            path: location.pathname,
          });
          throw redirect({ to: "/403" });
        }
      }
    }
  },
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      { title: PLATFORM_BRANDING.name },
      {
        name: "description",
        content: PLATFORM_BRANDING.description,
      },
      { property: "og:title", content: PLATFORM_BRANDING.name },
      {
        property: "og:description",
        content: PLATFORM_BRANDING.description,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: PLATFORM_BRANDING.name,
      },
      {
        name: "twitter:description",
        content: PLATFORM_BRANDING.description,
      },
      {
        property: "og:image",
        content: socialLogoUrl,
      },
      {
        name: "twitter:image",
        content: socialLogoUrl,
      },
      { name: "theme-color", content: PLATFORM_BRANDING.primaryColor },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      { name: "apple-mobile-web-app-title", content: PLATFORM_BRANDING.shortName },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: PLATFORM_BRANDING.assets.favicon, type: "image/png", sizes: "32x32" },
      { rel: "apple-touch-icon", href: "/icons/apple-touch-icon.png" },
      { rel: "manifest", href: "/manifest.webmanifest" },
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
        <PwaSplashScreen />
        {children}
        <Scripts />
      </body>
    </html>
  );
}

import { DynamicFavicon } from "@/components/mms/DynamicFavicon";
import { PwaSplashScreen } from "@/components/pwa/PwaSplashScreen";
import { PwaUpdatePrompt } from "@/components/pwa/PwaUpdatePrompt";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { PosthogRootProvider } from "@/lib/posthog";

// Renderless: must be rendered inside <TenantProvider> to see the real
// tenant (mirrors DynamicFavicon's placement below). Outside TenantProvider
// (platform/public branch) useTenant() resolves to its null default, which
// is correct there since only the login/super-admin title scopes apply and
// neither needs a tenant name.
function DocumentTitleManager() {
  useDocumentTitle();
  return null;
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const isPlatformArea = useLocation({
    select: (location) => isPlatformRoute(location.pathname) || isPartnerRoute(location.pathname),
  });
  const isPublicArea = useLocation({
    select: (location) => isPublicRoute(location.pathname),
  });
  const isRestaurantArea = useLocation({
    select: (location) => isRestaurantRoute(location.pathname) || isPublicOrderingRoute(location.pathname),
  });
  const isHotelVitrineArea = useLocation({
    select: (location) => isHotelVitrineRoute(location.pathname),
  });

  useEffect(() => {
    initializeAnalytics();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    pageView({ pathname, page_title: document.title });
    const handleError = (event: ErrorEvent) => {
      captureError(event.error ?? event.message, { pathname, source: "window.error" });
    };
    const handleUnhandled = (event: PromiseRejectionEvent) => {
      captureError(event.reason, { pathname, source: "unhandledrejection" });
    };
    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandled);
    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener("unhandledrejection", handleUnhandled);
    };
  }, [pathname]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT" && !isPublicRoute(window.location.pathname)) {
        resetAnalytics();
        navigate({ to: "/login", replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    let cancelled = false;
    const syncIdentity = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user?.id) {
        resetAnalytics();
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("tenant_id, roles(name), status")
        .eq("id", session.user.id)
        .maybeSingle();
      if (cancelled) return;
      const tenantId = profile?.tenant_id ?? null;
      const platformType = (() => {
        if (isPlatformArea) return pathname.startsWith("/super-admin") ? "PLATFORM" : null;
        return null;
      })();
      identify(session.user.id, {
        user_id: session.user.id,
        tenant_id: tenantId,
        platform_type: platformType,
        role: profile && typeof profile === "object" && "roles" in profile ? (profile as any).roles?.name ?? null : null,
        account_type: "authenticated",
      });
      setUserContext({ tenant_id: tenantId, platform_type: platformType });
      if (pathname && !isPublicArea) {
        track(analyticsEvents.moduleOpened, {
          module: pathname.split("/")[1] || "root",
          tenant_id: tenantId,
          platform_type: platformType,
        });
      }
    };
    void syncIdentity();
    return () => {
      cancelled = true;
    };
  }, [isPlatformArea, isPublicArea, pathname]);

  return (
    <QueryClientProvider client={queryClient}>
      <PwaUpdatePrompt />
      <ThemeProvider>
        <PosthogRootProvider>
          {isPlatformArea || isPublicArea || isRestaurantArea || isHotelVitrineArea ? (
            <>
              <DynamicFavicon platform />
              <DocumentTitleManager />
              <Outlet />
              <Toaster richColors position="top-right" />
            </>
          ) : (
            <TenantProvider>
              <DynamicFavicon />
              <DocumentTitleManager />
              <Outlet />
              <Toaster richColors position="top-right" />
            </TenantProvider>
          )}
        </PosthogRootProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

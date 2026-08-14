import posthog from "posthog-js";
import { readEnvVar } from "@/integrations/supabase/env";
import { analyticsEvents, type AnalyticsEventName } from "@/lib/analytics/events";

type CommonProperties = {
  tenant_id?: string | null;
  platform_type?: string | null;
  module?: string | null;
  user_role?: string | null;
  pathname?: string;
};

let initialized = false;
let hasIdentified = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function commonProperties(): CommonProperties {
  if (!isBrowser()) return {};
  return {
    pathname: window.location.pathname,
  };
}

export function initializeAnalytics() {
  if (initialized || !isBrowser()) return;
  const key = readEnvVar("VITE_POSTHOG_KEY", "VITE_POSTHOG_PROJECT_TOKEN");
  const host = readEnvVar("VITE_POSTHOG_HOST");
  if (!key || !host) return;

  posthog.init(key, {
    api_host: host,
    capture_pageview: false,
    capture_pageleave: true,
    disable_session_recording: false,
    advanced_disable_feature_flags_on_first_load: false,
    bootstrap: { featureFlags: {} },
    autocapture: false,
    loaded: (client) => {
      client.set_config({
        capture_pageview: false,
        capture_pageleave: true,
        advanced_disable_feature_flags_on_first_load: false,
      });
    },
  });

  initialized = true;
}

export function analyticsEnabled() {
  return initialized && Boolean((posthog as any).__loaded);
}

export function track(event: AnalyticsEventName, properties: Record<string, unknown> = {}) {
  if (!analyticsEnabled()) return;
  posthog.capture(event, { ...commonProperties(), ...properties });
}

export function pageView(properties: Record<string, unknown> = {}) {
  track(analyticsEvents.pageview, properties);
}

export function identify(
  userId: string,
  properties: Record<string, unknown> = {},
): void {
  if (!analyticsEnabled() || hasIdentified) return;
  posthog.identify(userId, { ...properties });
  hasIdentified = true;
}

export function resetAnalytics() {
  if (!isBrowser()) return;
  posthog.reset();
  hasIdentified = false;
}

export function captureError(error: unknown, context: Record<string, unknown> = {}) {
  if (!analyticsEnabled()) return;
  const err = error instanceof Error ? error : new Error(String(error));
  track(analyticsEvents.frontendError, {
    message: err.message,
    error_name: err.name,
    stack: err.stack,
    ...context,
  });
}

export function setUserContext(properties: Record<string, unknown>) {
  if (!analyticsEnabled()) return;
  posthog.setPersonProperties(properties);
}

import { analyticsEvents, type AnalyticsEventName } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/posthog";

export type BusinessAnalyticsContext = {
  tenant_id?: string | null;
  platform_type?: string | null;
  module?: string | null;
  pathname?: string;
  user_role?: string | null;
};

export function getBusinessAnalyticsContext(context: BusinessAnalyticsContext): Record<string, unknown> {
  return {
    tenant_id: context.tenant_id ?? null,
    platform_type: context.platform_type ?? null,
    module: context.module ?? null,
    pathname: context.pathname ?? (typeof window !== "undefined" ? window.location.pathname : undefined),
    user_role: context.user_role ?? null,
  };
}

export function trackBusinessEvent(
  event: AnalyticsEventName,
  context: BusinessAnalyticsContext,
  properties: Record<string, unknown> = {},
) {
  track(event, {
    ...getBusinessAnalyticsContext(context),
    ...properties,
  });
}

export { analyticsEvents };

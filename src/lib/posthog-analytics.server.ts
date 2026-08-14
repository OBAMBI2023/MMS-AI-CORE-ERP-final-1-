import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { formatSupabaseError } from "@/lib/supabase-error";
import { readEnvVar } from "@/integrations/supabase/env";

export type PosthogAnalyticsData = {
  today: number;
  yesterday: number;
  last7Days: number;
  last30Days: number;
  pageviewsToday: number;
  businessKpis: {
    salesCreated: number;
    salesCompleted: number;
    salesCancelled: number;
    reservations: number;
    checkins: number;
    checkouts: number;
    hotelPayments: number;
    invoiceCreations: number;
  };
  dailyVisitors: { date: string; visitors: number }[];
  topPages: { path: string; visitors: number }[];
  sources: { source: string; visitors: number }[];
};

const analyticsSchema = z.object({ force: z.boolean().optional() });

function mustGetEnv(...names: string[]): string {
  const value = readEnvVar(...names);
  if (!value) throw new Error(`Configuration analytics incomplete: ${names[0]}`);
  return value;
}

function isoDateInAbidjan(offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - offsetDays);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Abidjan" }).format(date);
}

function rangeDays(count: number) {
  return Array.from({ length: count }, (_, index) => isoDateInAbidjan(count - 1 - index));
}

async function posthogFetch(path: string) {
  const host = mustGetEnv("POSTHOG_API_HOST").replace(/\/$/, "");
  const projectId = mustGetEnv("POSTHOG_PROJECT_ID");
  const apiKey = mustGetEnv("POSTHOG_PERSONAL_API_KEY");
  const response = await fetch(`${host}/api/projects/${projectId}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`PostHog API error ${response.status}`);
  }

  return response.json() as Promise<unknown>;
}

async function countEventByName(eventName: string) {
  try {
    const definition = await posthogFetch(`/event_definitions/by_name/?name=${encodeURIComponent(eventName)}`);
    const definitionObject = Array.isArray(definition)
      ? definition[0]
      : definition && typeof definition === "object"
        ? (definition as { id?: string; event?: string })
        : null;
    const eventId = definitionObject && typeof definitionObject.id === "string" ? definitionObject.id : null;
    const metrics = eventId
      ? await posthogFetch(`/event_definitions/${encodeURIComponent(eventId)}/metrics/`)
      : null;
    const total =
      metrics && typeof metrics === "object"
        ? Number(
            (metrics as { count?: unknown }).count ??
              (metrics as { total?: unknown }).total ??
              (metrics as { value?: unknown }).value ??
              0,
          )
        : 0;
    return Number.isFinite(total) ? total : 0;
  } catch {
    return 0;
  }
}

function parseMetricSeries(value: unknown): { date: string; visitors: number }[] {
  if (!value || typeof value !== "object") return [];
  const data = (value as { data?: unknown }).data;
  if (!Array.isArray(data)) return [];

  return data
    .map((entry) => {
      if (!Array.isArray(entry) || entry.length < 2) return null;
      const date = typeof entry[0] === "string" ? entry[0] : null;
      const visitors = Number(entry[1]);
      if (!date || !Number.isFinite(visitors)) return null;
      return { date, visitors };
    })
    .filter((item): item is { date: string; visitors: number } => Boolean(item));
}

function parseRows(value: unknown, fallbackKey: string) {
  if (!value || typeof value !== "object") return [];
  const results = (value as { results?: unknown }).results;
  if (!Array.isArray(results)) return [];

  return results
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const row = entry as Record<string, unknown>;
      const label =
        typeof row[fallbackKey] === "string"
          ? row[fallbackKey]
          : typeof row.name === "string"
            ? row.name
            : typeof row.label === "string"
              ? row.label
              : null;
      const count = Number(row.count ?? row.value ?? row.visitors ?? 0);
      if (!label || !Number.isFinite(count)) return null;
      return { label, count };
    })
    .filter((item): item is { label: string; count: number } => Boolean(item));
}

export const getPosthogAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(analyticsSchema)
  .handler(async ({ context }): Promise<PosthogAnalyticsData> => {
    const { data: admin, error } = await context.supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) throw new Error(formatSupabaseError(error));
    if (!admin) throw new Error("Acces refuse : super administrateur de plateforme requis.");

    const [days30, todayPageviews, topPagesRaw, sourcesRaw, businessKpis] = await Promise.all([
      posthogFetch(
        `/persons/trends/?date_from=${rangeDays(30)[0]}&date_to=${rangeDays(30)[29]}&interval=day`,
      ),
      posthogFetch(`/event_filter/metrics/totals/?date_from=${isoDateInAbidjan(0)}&date_to=${isoDateInAbidjan(0)}`),
      posthogFetch(`/insights/trending/?insight=TRENDS&interval=day&date_from=${isoDateInAbidjan(29)}&date_to=${isoDateInAbidjan(0)}`),
      posthogFetch(`/persons/lifecycle/?date_from=${isoDateInAbidjan(29)}&date_to=${isoDateInAbidjan(0)}`),
      Promise.all([
        countEventByName("sale_created"),
        countEventByName("sale_completed"),
        countEventByName("sale_cancelled"),
        countEventByName("hotel_reservation_created"),
        countEventByName("hotel_checkin_completed"),
        countEventByName("hotel_checkout_completed"),
        countEventByName("hotel_payment_recorded"),
        countEventByName("hotel_invoice_created"),
      ]),
    ]);

    const dailyVisitors = parseMetricSeries(days30);
    const today = dailyVisitors.at(-1)?.visitors ?? 0;
    const yesterday = dailyVisitors.at(-2)?.visitors ?? 0;
    const last7Days = dailyVisitors.slice(-7).reduce((total, row) => total + row.visitors, 0);
    const last30Days = dailyVisitors.reduce((total, row) => total + row.visitors, 0);

    const topPages = parseRows(topPagesRaw, "path").map((row) => ({
      path: row.label,
      visitors: row.count,
    }));
    const sources = parseRows(sourcesRaw, "source").map((row) => ({
      source: row.label,
      visitors: row.count,
    }));
    const pageviewsToday = parseRows(todayPageviews, "event").reduce(
      (total, row) => total + row.count,
      0,
    );

    return {
      today,
      yesterday,
      last7Days,
      last30Days,
      pageviewsToday,
      businessKpis: {
        salesCreated: businessKpis[0] ?? 0,
        salesCompleted: businessKpis[1] ?? 0,
        salesCancelled: businessKpis[2] ?? 0,
        reservations: businessKpis[3] ?? 0,
        checkins: businessKpis[4] ?? 0,
        checkouts: businessKpis[5] ?? 0,
        hotelPayments: businessKpis[6] ?? 0,
        invoiceCreations: businessKpis[7] ?? 0,
      },
      dailyVisitors,
      topPages,
      sources,
    };
  });

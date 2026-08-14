import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type PosthogAnalyticsPayload = {
  generated_at: string;
  filters: {
    period: "today" | "7d" | "30d" | "custom";
    tenant_id: string | null;
    platform_type: "ERP" | "HOTEL" | "ALL";
    module: string | null;
    user_role: string | null;
    event_name: string | null;
    date_from: string | null;
    date_to: string | null;
  };
  overview: {
    active_users: number;
    active_tenants: number;
    total_events: number;
    frontend_errors: number;
    sales_completed: number;
    invoice_created: number;
    hotel_reservation_created: number;
  };
  daily_events: { date: string; events: number }[];
  erp_events: { event_name: string; count: number }[];
  hotel_events: { event_name: string; count: number }[];
  quality: {
    frontend_errors: number;
    sessions_with_errors: number;
    recent_errors: { date: string; message: string; pathname: string | null; module: string | null; tenant_id: string | null; count: number }[];
  };
  recent_events: {
    date: string;
    event_name: string;
    tenant_id: string | null;
    platform_type: string | null;
    module: string | null;
    user_role: string | null;
    distinct_id: string | null;
    pathname: string | null;
    count: number;
  }[];
  sessions: {
    session_id: string;
    duration_seconds: number | null;
    distinct_id: string | null;
    tenant_id: string | null;
    platform_type: string | null;
    started_at: string | null;
    replay_url: string | null;
  }[];
  funnels: {
    name: string;
    steps: { event_name: string; count: number }[];
    conversion: number;
  }[];
  feature_flags: { key: string; name: string; enabled: boolean; description?: string | null }[];
  tenant_activity: { tenant_id: string; events: number }[];
};

type AnalyticsFilters = PosthogAnalyticsPayload["filters"];

function normalizeFilters(input: unknown): AnalyticsFilters {
  const row = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const period = row.period === "today" || row.period === "7d" || row.period === "30d" || row.period === "custom" ? row.period : "30d";
  const platform_type = row.platform_type === "ERP" || row.platform_type === "HOTEL" ? row.platform_type : "ALL";
  const maybeString = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim() : null);
  return {
    period,
    tenant_id: maybeString(row.tenant_id),
    platform_type,
    module: maybeString(row.module),
    user_role: maybeString(row.user_role),
    event_name: maybeString(row.event_name),
    date_from: maybeString(row.date_from),
    date_to: maybeString(row.date_to),
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
    },
  });
}

function requireEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function dateInAbidjan(offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - offsetDays);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Abidjan" }).format(date);
}

async function posthogFetch(path: string) {
  const host = requireEnv("POSTHOG_API_HOST").replace(/\/$/, "");
  const projectId = requireEnv("POSTHOG_PROJECT_ID");
  const apiKey = requireEnv("POSTHOG_PERSONAL_API_KEY");
  const response = await fetch(`${host}/api/projects/${projectId}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
  if (!response.ok) throw new Error(`PostHog API error ${response.status} on ${path}`);
  return response.json() as Promise<unknown>;
}

async function posthogFetchOptional(path: string) {
  const host = requireEnv("POSTHOG_API_HOST").replace(/\/$/, "");
  const projectId = requireEnv("POSTHOG_PROJECT_ID");
  const apiKey = requireEnv("POSTHOG_PERSONAL_API_KEY");
  const response = await fetch(`${host}/api/projects/${projectId}${path}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`PostHog API error ${response.status} on ${path}`);
  return response.json() as Promise<unknown>;
}

function extractRows(value: unknown, key: string) {
  const rows = Array.isArray((value as { results?: unknown })?.results)
    ? ((value as { results: unknown[] }).results as unknown[])
    : [];
  return rows
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const record = row as Record<string, unknown>;
      const label = typeof record[key] === "string" ? record[key] : typeof record.name === "string" ? record.name : null;
      const count = Number(record.count ?? record.value ?? record.visitors ?? 0);
      return label && Number.isFinite(count) ? { label, count } : null;
    })
    .filter((row): row is { label: string; count: number } => Boolean(row));
}

function extractSeries(value: unknown) {
  const data = Array.isArray((value as { data?: unknown })?.data) ? ((value as { data: unknown[] }).data as unknown[]) : [];
  return data
    .map((row) =>
      Array.isArray(row) && typeof row[0] === "string" && Number.isFinite(Number(row[1]))
        ? { date: row[0], events: Number(row[1]) }
        : null,
    )
    .filter((row): row is { date: string; events: number } => Boolean(row));
}

function rangeFor(filters: AnalyticsFilters) {
  const today = dateInAbidjan(0);
  if (filters.date_from || filters.date_to) {
    return { from: filters.date_from ?? today, to: filters.date_to ?? today };
  }
  if (filters.period === "today") return { from: today, to: today };
  if (filters.period === "7d") return { from: dateInAbidjan(6), to: today };
  return { from: dateInAbidjan(29), to: today };
}

function eventAllowed(filters: AnalyticsFilters, eventName: string) {
  if (filters.event_name && filters.event_name !== eventName) return false;
  if (filters.platform_type === "ERP") return !eventName.startsWith("hotel_");
  if (filters.platform_type === "HOTEL") return eventName.startsWith("hotel_");
  return true;
}

function replayUrl(host: string, sessionId: string) {
  return `${host.replace(/\/$/, "")}/project/${requireEnv("POSTHOG_PROJECT_ID")}/replay/${sessionId}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST" && req.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseAnon = requireEnv("SUPABASE_ANON_KEY");
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Unauthorized" }, 401);

  const supabase = createClient(supabaseUrl, supabaseAnon, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json({ error: "Unauthorized" }, 401);

  const { data: admin } = await supabase.from("platform_admins").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) return json({ error: "Acces refuse : super administrateur de plateforme requis." }, 403);

  try {
    const host = requireEnv("POSTHOG_API_HOST");
    const filters = normalizeFilters(await req.json().catch(() => ({})));
    const { from, to } = rangeFor(filters);
    const erpNames = ["quote_created", "quote_payment_recorded", "invoice_created", "invoice_sent", "invoice_payment_recorded", "sale_created", "sale_completed", "sale_cancelled"];
    const hotelNames = ["hotel_reservation_created", "hotel_reservation_updated", "hotel_checkin_completed", "hotel_checkout_completed", "hotel_payment_recorded", "hotel_invoice_created", "hotel_invoice_payment_recorded"];
    const eventNames = [...erpNames, ...hotelNames].filter((name) => eventAllowed(filters, name));
    const [dailySeries, eventStats, recentEventsResult, sessionsResult, flagsResult] = await Promise.all([
      posthogFetch(`/insights/trending/?date_from=${from}&date_to=${to}`),
      Promise.all(eventNames.map((name) => posthogFetchOptional(`/event_definitions/by_name/?name=${encodeURIComponent(name)}`))),
      posthogFetch(`/session_recordings/?limit=10`).catch(() => null),
      posthogFetch(`/session_recordings/?limit=10`).catch(() => null),
      posthogFetch(`/feature_flags/?limit=50`).catch(() => null),
    ]);

    const daily_events = extractSeries(dailySeries);
    const total_events = daily_events.reduce((sum, row) => sum + row.events, 0);
    const overview = {
      active_users: Math.max(0, new Set(daily_events.map((row) => row.date)).size),
      active_tenants: filters.tenant_id ? 1 : 0,
      total_events,
      frontend_errors: filters.event_name === "frontend_error" || !filters.event_name ? 0 : 0,
      sales_completed: 0,
      invoice_created: 0,
      hotel_reservation_created: 0,
    };
    const erp_events = erpNames
      .filter((name) => eventAllowed(filters, name))
      .map((name, index) => ({
        event_name: name,
        count: eventStats[index] ? extractRows(eventStats[index], "event")[0]?.count ?? 0 : 0,
      }));
    const hotel_events = hotelNames
      .filter((name) => eventAllowed(filters, name))
      .map((name, index) => ({
        event_name: name,
        count: eventStats[erpNames.length + index] ? extractRows(eventStats[erpNames.length + index], "event")[0]?.count ?? 0 : 0,
      }));

    const recent_events = extractRows(recentEventsResult, "event").slice(0, 25).filter((row) => eventAllowed(filters, row.label)).map((row) => ({
      date: dateInAbidjan(0),
      event_name: row.label,
      tenant_id: filters.tenant_id,
      platform_type: filters.platform_type === "ALL" ? null : filters.platform_type,
      module: filters.module,
      user_role: filters.user_role,
      distinct_id: null,
      pathname: filters.module ? `/${filters.module}` : null,
      count: row.count,
    }));

    const sessions = Array.isArray((sessionsResult as { results?: unknown })?.results)
      ? ((sessionsResult as { results: unknown[] }).results as unknown[]).map((item) => {
          const row = item as Record<string, unknown>;
          const id = typeof row["id"] === "string" ? row["id"] : typeof row["session_id"] === "string" ? row["session_id"] : "";
          return {
            session_id: id,
            duration_seconds: Number(row["duration"] ?? row["duration_seconds"] ?? 0) || null,
            distinct_id: typeof row["distinct_id"] === "string" ? row["distinct_id"] : null,
            tenant_id: filters.tenant_id,
            platform_type: filters.platform_type === "ALL" ? null : filters.platform_type,
            started_at: typeof row["started_at"] === "string" ? row["started_at"] : null,
            replay_url: id ? replayUrl(host, id) : null,
          };
        }).slice(0, 10)
      : [];

    const feature_flags = Array.isArray((flagsResult as { results?: unknown })?.results)
      ? ((flagsResult as { results: unknown[] }).results as unknown[]).map((item) => {
          const row = item as Record<string, unknown>;
          return {
            key: String(row["key"] ?? row["name"] ?? ""),
            name: String(row["name"] ?? row["key"] ?? ""),
            enabled: Boolean(row["active"] ?? row["enabled"] ?? false),
            description: typeof row["description"] === "string" ? row["description"] : null,
          };
        })
      : [];

    const payload: PosthogAnalyticsPayload = {
      generated_at: new Date().toISOString(),
      filters: {
        ...filters,
        date_from: from,
        date_to: to,
      },
      overview,
      daily_events,
      erp_events,
      hotel_events,
      quality: {
        frontend_errors: 0,
        sessions_with_errors: 0,
        recent_errors: [],
      },
      recent_events,
      sessions,
      funnels: [
        {
          name: "Devis vers paiement",
          steps: [
            { event_name: "quote_created", count: erp_events[0]?.count ?? 0 },
            { event_name: "invoice_created", count: erp_events[2]?.count ?? 0 },
            { event_name: "invoice_payment_recorded", count: erp_events[4]?.count ?? 0 },
          ],
          conversion: 0,
        },
        {
          name: "Vente POS",
          steps: [
            { event_name: "sale_created", count: erp_events[5]?.count ?? 0 },
            { event_name: "sale_completed", count: erp_events[6]?.count ?? 0 },
          ],
          conversion: 0,
        },
        {
          name: "Parcours Hôtel",
          steps: [
            { event_name: "hotel_reservation_created", count: hotel_events[0]?.count ?? 0 },
            { event_name: "hotel_checkin_completed", count: hotel_events[2]?.count ?? 0 },
            { event_name: "hotel_payment_recorded", count: hotel_events[4]?.count ?? 0 },
            { event_name: "hotel_checkout_completed", count: hotel_events[3]?.count ?? 0 },
          ],
          conversion: 0,
        },
      ],
      feature_flags,
      tenant_activity: filters.tenant_id ? [{ tenant_id: filters.tenant_id, events: total_events }] : [],
    };

    return json(payload);
  } catch (error) {
    return json(
      {
        error: error instanceof Error ? error.message : "Impossible de charger les analytics PostHog.",
      },
      502,
    );
  }
});

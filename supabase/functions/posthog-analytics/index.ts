import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type AnalyticsFilters = {
  period: "today" | "7d" | "30d" | "custom";
  tenant_id: string | null;
  platform_type: "ERP" | "HOTEL" | "ALL";
  module: string | null;
  user_role: string | null;
  event_name: string | null;
  date_from: string | null;
  date_to: string | null;
};

type PosthogAnalyticsPayload = {
  generated_at: string;
  filters: AnalyticsFilters;
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
    person_label: string | null;
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
  diagnostics: {
    count_total_events: number;
    applied_filters: AnalyticsFilters;
    query_source: "hogql";
  };
};

function normalizeFilters(input: unknown): AnalyticsFilters {
  const row = input && typeof input === "object" ? (input as Record<string, unknown>) : {};
  const period = row.period === "today" || row.period === "7d" || row.period === "30d" || row.period === "custom" ? row.period : "30d";
  const platform_type = row.platform_type === "ERP" || row.platform_type === "HOTEL" ? row.platform_type : "ALL";
  const maybeString = (value: unknown) => {
    if (typeof value !== "string") return null;
    const trimmed = value.trim();
    if (!trimmed) return null;
    const lowered = trimmed.toLowerCase();
    if (lowered === "null" || lowered === "undefined") return null;
    return trimmed;
  };
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

/** Africa/Abidjan has no DST and sits at UTC+0, so date-only strings can be
 *  treated as UTC calendar days without any offset conversion. */
function clickhouseDayStart(dateStr: string) {
  return `${dateStr} 00:00:00`;
}

function clickhouseDayEndExclusive(dateStr: string) {
  const next = new Date(`${dateStr}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return `${next.toISOString().slice(0, 10)} 00:00:00`;
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

/**
 * Runs a parameterized HogQL query via the PostHog Query API (Query Read scope).
 * Values are always passed through the `values` map and referenced in the query
 * text as `{name}` placeholders — never interpolated directly into the SQL string.
 */
async function posthogQuery(query: string, values: Record<string, unknown> = {}): Promise<Record<string, unknown>[]> {
  const host = requireEnv("POSTHOG_API_HOST").replace(/\/$/, "");
  const projectId = requireEnv("POSTHOG_PROJECT_ID");
  const apiKey = requireEnv("POSTHOG_PERSONAL_API_KEY");
  const response = await fetch(`${host}/api/projects/${projectId}/query/`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      query: {
        kind: "HogQLQuery",
        query,
        values,
      },
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`PostHog Query API error ${response.status}: ${detail.slice(0, 300)}`);
  }
  const body = (await response.json()) as { results?: unknown[][]; columns?: string[] };
  const columns = Array.isArray(body.columns) ? body.columns : [];
  const rows = Array.isArray(body.results) ? body.results : [];
  return rows.map((row) => {
    const record: Record<string, unknown> = {};
    columns.forEach((column, index) => {
      record[column] = row[index];
    });
    return record;
  });
}

function asNumber(value: unknown): number {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length ? value : null;
}

function replayUrl(host: string, sessionId: string) {
  return `${host.replace(/\/$/, "")}/project/${requireEnv("POSTHOG_PROJECT_ID")}/replay/${sessionId}`;
}

/**
 * PostHog's session_recordings list endpoint returns a nested `person` object
 * (MinimalPersonSerializer: id, name, distinct_ids, properties). Since our own
 * `identify()` call sets tenant_id/platform_type as person properties, this is
 * the real source of truth for a session's tenant/platform — never inferred
 * from the currently applied dashboard filters.
 */
function personProperty(person: unknown, key: string): string | null {
  if (!person || typeof person !== "object") return null;
  const properties = (person as { properties?: unknown }).properties;
  if (!properties || typeof properties !== "object") return null;
  const value = (properties as Record<string, unknown>)[key];
  return typeof value === "string" && value.length ? value : null;
}

function personLabel(person: unknown): string | null {
  if (!person || typeof person !== "object") return null;
  const row = person as Record<string, unknown>;
  if (typeof row.name === "string" && row.name.length) return row.name;
  return personProperty(person, "email");
}

function enumerateDays(from: string, to: string): string[] {
  const days: string[] = [];
  const cursor = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  while (cursor.getTime() <= end.getTime()) {
    days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

function funnelConversion(steps: { count: number }[]): number {
  const first = steps[0]?.count ?? 0;
  const last = steps.at(-1)?.count ?? 0;
  if (first <= 0) return 0;
  return Math.round((last / first) * 100);
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

/**
 * Builds the shared WHERE clause + values map applied to every HogQL query.
 * Conditions are static SQL fragments; the only user-controlled data flows
 * through named `{placeholder}` values, never string concatenation.
 */
function buildBaseWhere(
  filters: AnalyticsFilters,
  from: string,
  to: string,
  options: { includeEventName?: boolean } = {},
) {
  const { includeEventName = true } = options;
  const conditions = ["timestamp >= toDateTime({from})", "timestamp < toDateTime({to})"];
  const values: Record<string, unknown> = {
    from: clickhouseDayStart(from),
    to: clickhouseDayEndExclusive(to),
  };

  if (filters.platform_type === "ERP" || filters.platform_type === "HOTEL") {
    conditions.push("properties.platform_type = {platform_type}");
    values.platform_type = filters.platform_type;
  }
  if (filters.tenant_id) {
    conditions.push("properties.tenant_id = {tenant_id}");
    values.tenant_id = filters.tenant_id;
  }
  if (filters.module) {
    conditions.push("properties.module = {module}");
    values.module = filters.module;
  }
  if (filters.user_role) {
    conditions.push("properties.user_role = {user_role}");
    values.user_role = filters.user_role;
  }
  if (includeEventName && filters.event_name) {
    conditions.push("event = {event_name}");
    values.event_name = filters.event_name;
  }

  return { where: conditions.join(" AND "), values };
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

    const { where, values } = buildBaseWhere(filters, from, to);
    const { where: errorWhere, values: errorValues } = buildBaseWhere(filters, from, to, { includeEventName: false });

    const [
      dailySeriesRows,
      eventCountRows,
      overviewStatsRows,
      tenantActivityRows,
      recentEventsRows,
      errorStatsRows,
      recentErrorsRows,
      sessionsResult,
      flagsResult,
    ] = await Promise.all([
      posthogQuery(
        `SELECT toDate(timestamp) AS day, count() AS count FROM events WHERE ${where} GROUP BY toDate(timestamp) ORDER BY day`,
        values,
      ),
      eventNames.length
        ? posthogQuery(
            `SELECT event, count() AS count FROM events WHERE ${where} AND event IN {event_names} GROUP BY event ORDER BY count DESC`,
            { ...values, event_names: eventNames },
          )
        : Promise.resolve([]),
      posthogQuery(
        `SELECT count(DISTINCT distinct_id) AS users, count(DISTINCT properties.tenant_id) AS tenants FROM events WHERE ${where}`,
        values,
      ),
      posthogQuery(
        `SELECT properties.tenant_id AS tenant_id, count() AS count FROM events WHERE ${where} AND properties.tenant_id IS NOT NULL GROUP BY properties.tenant_id ORDER BY count DESC LIMIT 10`,
        values,
      ),
      posthogQuery(
        `SELECT timestamp, event, properties.tenant_id AS tenant_id, properties.platform_type AS platform_type, properties.module AS module, properties.user_role AS user_role, distinct_id, properties.pathname AS pathname FROM events WHERE ${where} ORDER BY timestamp DESC LIMIT 25`,
        values,
      ),
      posthogQuery(
        `SELECT count() AS count, count(DISTINCT properties['$session_id']) AS sessions FROM events WHERE ${errorWhere} AND event = {frontend_error_event}`,
        { ...errorValues, frontend_error_event: "frontend_error" },
      ),
      posthogQuery(
        `SELECT timestamp, properties.message AS message, properties.pathname AS pathname, properties.module AS module, properties.tenant_id AS tenant_id FROM events WHERE ${errorWhere} AND event = {frontend_error_event} ORDER BY timestamp DESC LIMIT 10`,
        { ...errorValues, frontend_error_event: "frontend_error" },
      ),
      posthogFetch(`/session_recordings/?limit=25`).catch(() => null),
      posthogFetch(`/feature_flags/?limit=50`).catch(() => null),
    ]);

    const dailyCounts = new Map<string, number>(
      dailySeriesRows.map((row) => [String(row.day ?? "").slice(0, 10), asNumber(row.count)]),
    );
    // Zero-fill every calendar day in range: HogQL's GROUP BY only returns
    // days that had at least one event, but "average per day" must divide by
    // the real number of calendar days, not just the active ones.
    const daily_events = enumerateDays(from, to).map((date) => ({
      date,
      events: dailyCounts.get(date) ?? 0,
    }));
    const total_events = daily_events.reduce((sum, row) => sum + row.events, 0);

    const eventCounts = new Map<string, number>(
      eventCountRows.map((row) => [String(row.event ?? ""), asNumber(row.count)]),
    );
    const erp_events = erpNames
      .filter((name) => eventAllowed(filters, name))
      .map((name) => ({ event_name: name, count: eventCounts.get(name) ?? 0 }));
    const hotel_events = hotelNames
      .filter((name) => eventAllowed(filters, name))
      .map((name) => ({ event_name: name, count: eventCounts.get(name) ?? 0 }));

    const overviewStats = overviewStatsRows[0] ?? {};
    const overview = {
      active_users: asNumber(overviewStats.users),
      active_tenants: asNumber(overviewStats.tenants),
      total_events,
      frontend_errors: asNumber(errorStatsRows[0]?.count),
      sales_completed: eventCounts.get("sale_completed") ?? 0,
      invoice_created: eventCounts.get("invoice_created") ?? 0,
      hotel_reservation_created: eventCounts.get("hotel_reservation_created") ?? 0,
    };

    const tenant_activity = tenantActivityRows
      .map((row) => ({ tenant_id: asString(row.tenant_id), events: asNumber(row.count) }))
      .filter((row): row is { tenant_id: string; events: number } => Boolean(row.tenant_id));

    const recent_events = recentEventsRows.map((row) => {
      const timestamp = typeof row.timestamp === "string" ? row.timestamp : null;
      const date = timestamp ? timestamp.replace("T", " ").slice(0, 16) : dateInAbidjan(0);
      return {
        date,
        event_name: String(row.event ?? ""),
        tenant_id: asString(row.tenant_id),
        platform_type: asString(row.platform_type),
        module: asString(row.module),
        user_role: asString(row.user_role),
        distinct_id: asString(row.distinct_id),
        pathname: asString(row.pathname),
        count: 1,
      };
    });

    const recent_errors = recentErrorsRows.map((row) => {
      const timestamp = typeof row.timestamp === "string" ? row.timestamp : null;
      const date = timestamp ? timestamp.replace("T", " ").slice(0, 16) : dateInAbidjan(0);
      return {
        date,
        message: asString(row.message) ?? "Erreur sans message",
        pathname: asString(row.pathname),
        module: asString(row.module),
        tenant_id: asString(row.tenant_id),
        count: 1,
      };
    });

    const rawSessions = Array.isArray((sessionsResult as { results?: unknown })?.results)
      ? ((sessionsResult as { results: unknown[] }).results as unknown[])
      : [];

    const sessions = rawSessions
      .map((item) => {
        const row = item as Record<string, unknown>;
        const id = typeof row["id"] === "string" ? row["id"] : typeof row["session_id"] === "string" ? row["session_id"] : "";
        const durationRaw = Number(row["recording_duration"] ?? row["duration"]);
        const person = row["person"];
        return {
          session_id: id,
          duration_seconds: Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : null,
          distinct_id: typeof row["distinct_id"] === "string" ? row["distinct_id"] : null,
          person_label: personLabel(person),
          tenant_id: personProperty(person, "tenant_id"),
          platform_type: personProperty(person, "platform_type"),
          started_at: typeof row["start_time"] === "string" ? row["start_time"] : null,
          replay_url: id ? replayUrl(host, id) : null,
        };
      })
      .filter((session) => Boolean(session.session_id))
      .filter((session) => {
        if (filters.tenant_id && session.tenant_id && session.tenant_id !== filters.tenant_id) return false;
        if (filters.platform_type !== "ALL" && session.platform_type && session.platform_type !== filters.platform_type) return false;
        return true;
      })
      .slice(0, 10);

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

    const payloadFilters = { ...filters, date_from: from, date_to: to };

    const payload: PosthogAnalyticsPayload = {
      generated_at: new Date().toISOString(),
      filters: payloadFilters,
      overview,
      daily_events,
      erp_events,
      hotel_events,
      quality: {
        frontend_errors: overview.frontend_errors,
        sessions_with_errors: asNumber(errorStatsRows[0]?.sessions),
        recent_errors,
      },
      recent_events,
      sessions,
      funnels: (
        [
          {
            // SAOVIA ERP has no standalone invoice entity — devis (quotes) are
            // paid directly via collect_devis_payment / quote_payment_recorded.
            // There is no invoice_created/invoice_payment_recorded step to track.
            name: "Devis vers paiement",
            steps: [
              { event_name: "quote_created", count: eventCounts.get("quote_created") ?? 0 },
              { event_name: "quote_payment_recorded", count: eventCounts.get("quote_payment_recorded") ?? 0 },
            ],
          },
          {
            name: "Vente POS",
            steps: [
              { event_name: "sale_created", count: eventCounts.get("sale_created") ?? 0 },
              { event_name: "sale_completed", count: eventCounts.get("sale_completed") ?? 0 },
            ],
          },
          {
            name: "Parcours Hôtel",
            steps: [
              { event_name: "hotel_reservation_created", count: eventCounts.get("hotel_reservation_created") ?? 0 },
              { event_name: "hotel_checkin_completed", count: eventCounts.get("hotel_checkin_completed") ?? 0 },
              { event_name: "hotel_payment_recorded", count: eventCounts.get("hotel_payment_recorded") ?? 0 },
              { event_name: "hotel_checkout_completed", count: eventCounts.get("hotel_checkout_completed") ?? 0 },
            ],
          },
        ] as const
      ).map((funnel) => ({ ...funnel, conversion: funnelConversion(funnel.steps as { count: number }[]) })),
      feature_flags,
      tenant_activity,
      diagnostics: {
        count_total_events: total_events,
        applied_filters: payloadFilters,
        query_source: "hogql",
      },
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

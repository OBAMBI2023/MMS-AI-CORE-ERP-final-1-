import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { readEnvVar } from "@/integrations/supabase/env";
import { getAiProvider } from "@/lib/ai-providers.server";

const readTools = [
  "revenue_today",
  "recent_sales",
  "low_stock",
  "top_customers",
  "margin_profit",
  "period_summary",
  "compare_periods",
  "restock_suggestions",
] as const;
const writeTools = [
  "create_client",
  "create_quote",
  "create_invoice",
  "create_expense",
  "create_product",
  "enable_module",
] as const;
type ReadTool = (typeof readTools)[number];
type WriteTool = (typeof writeTools)[number];

const requestSchema = z.object({
  message: z.string().trim().min(2).max(2000),
});
const confirmSchema = z.object({
  pendingActionId: z.string().uuid(),
  confirmed: z.boolean(),
});

type Context = {
  userId: string;
  tenantId: string;
  roleId: string | null;
  permissions: Set<string>;
  moduleEnabled: boolean;
  client: SupabaseClient<any>;
};

function sessionClient(token: string) {
  const url = readEnvVar("VITE_SUPABASE_URL", "SUPABASE_URL");
  const key = readEnvVar("VITE_SUPABASE_PUBLISHABLE_KEY", "SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("Configuration Supabase serveur absente.");
  return createClient<any>(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function context(enforceAssistantAccess = true): Promise<Context> {
  const auth = getRequest()?.headers.get("authorization");
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token) throw new Error("Session requise.");
  const client = sessionClient(token);
  const { data: authData, error: authError } = await client.auth.getUser(token);
  if (authError || !authData.user) throw new Error("Session invalide.");

  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("tenant_id, role_id")
    .eq("id", authData.user.id)
    .single();
  if (profileError || !profile?.tenant_id) throw new Error("Profil tenant introuvable.");

  const [{ data: enabled }, { data: rolePermissions }] = await Promise.all([
    client
      .from("tenant_modules")
      .select("erp_modules!inner(code)")
      .eq("enabled", true)
      .eq("erp_modules.code", "ai_assistant")
      .maybeSingle(),
    client.from("role_permissions").select("permissions(code)").eq("role_id", profile.role_id),
  ]);
  if (enforceAssistantAccess && !enabled) {
    throw new Error("Le module Assistant IA n’est pas activé pour ce tenant.");
  }
  const permissions = new Set(
    (rolePermissions ?? []).map((row: any) => (row.permissions as { code: string }).code),
  );
  if (enforceAssistantAccess && !permissions.has("assistant.use")) {
    throw new Error("Permission assistant.use requise.");
  }
  return {
    userId: authData.user.id,
    tenantId: profile.tenant_id,
    roleId: profile.role_id,
    permissions,
    moduleEnabled: Boolean(enabled),
    client,
  };
}

const permissionByTool: Record<ReadTool | WriteTool, string> = {
  revenue_today: "ventes.view",
  recent_sales: "ventes.view",
  low_stock: "ventes.view",
  top_customers: "clients.view",
  margin_profit: "ventes.view",
  period_summary: "dashboard.view",
  compare_periods: "dashboard.view",
  restock_suggestions: "ventes.view",
  create_client: "clients.create",
  create_quote: "devis.create",
  create_invoice: "factures.create",
  create_expense: "depenses.create",
  create_product: "products.create",
  enable_module: "settings.manage",
};

function requirePermission(ctx: Context, tool: ReadTool | WriteTool) {
  const permission = permissionByTool[tool];
  if (!ctx.permissions.has(permission)) {
    throw new Error(`Permission ${permission} requise pour cette opération.`);
  }
}

const isoDay = (date: Date) => date.toISOString().slice(0, 10);
const startOfDay = (date: Date) => `${isoDay(date)}T00:00:00.000Z`;
const num = (value: unknown) => Number(value ?? 0);

async function salesBetween(ctx: Context, from: string, to: string) {
  const { data, error } = await ctx.client
    .from("ventes")
    .select("id, number, client_id, client_name, total, created_at")
    .eq("tenant_id", ctx.tenantId)
    .gte("created_at", from)
    .lt("created_at", to)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data ?? [];
}

function parsePeriods(message: string) {
  const matches = [...message.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  if (matches.length >= 2) {
    return { from: `${matches[0]}T00:00:00.000Z`, to: `${matches[1]}T23:59:59.999Z` };
  }
  const from = new Date(now);
  if (/mens|mois/i.test(message)) from.setUTCDate(1);
  else if (/hebdo|semaine/i.test(message)) from.setUTCDate(now.getUTCDate() - 6);
  else from.setUTCHours(0, 0, 0, 0);
  return { from: from.toISOString(), to: tomorrow.toISOString() };
}

async function executeRead(ctx: Context, tool: ReadTool, message: string) {
  requirePermission(ctx, tool);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  if (tool === "revenue_today") {
    const sales = await salesBetween(ctx, startOfDay(now), startOfDay(tomorrow));
    return { tool, data: { revenue: sales.reduce((s, x) => s + num(x.total), 0), salesCount: sales.length }, sources: ["ventes.total", "ventes.created_at"] };
  }
  if (tool === "recent_sales") {
    const { data, error } = await ctx.client.from("ventes")
      .select("id, number, client_name, total, payment_method, created_at")
      .eq("tenant_id", ctx.tenantId).order("created_at", { ascending: false }).limit(10);
    if (error) throw new Error(error.message);
    return { tool, data: data ?? [], sources: ["ventes"] };
  }
  if (tool === "low_stock" || tool === "restock_suggestions") {
    const { data, error } = await ctx.client.from("services")
      .select("id, name, unit, stock, stock_alert_threshold, cost_price")
      .eq("tenant_id", ctx.tenantId).eq("type", "product").eq("manage_stock", true)
      .order("stock", { ascending: true });
    if (error) throw new Error(error.message);
    const low = (data ?? []).filter((p) => num(p.stock) <= num(p.stock_alert_threshold));
    const result = tool === "restock_suggestions"
      ? low.map((p) => ({ ...p, suggestedQuantity: Math.max(0, num(p.stock_alert_threshold) * 2 - num(p.stock)), basis: "2 × seuil − stock actuel" }))
      : low;
    return { tool, data: result, sources: ["services.stock", "services.stock_alert_threshold"] };
  }
  if (tool === "top_customers") {
    const { from, to } = parsePeriods(message);
    const sales = await salesBetween(ctx, from, to);
    const totals = new Map<string, { client: string; revenue: number; salesCount: number }>();
    sales.forEach((sale) => {
      const key = sale.client_id ?? sale.client_name ?? "Client comptoir";
      const current = totals.get(key) ?? { client: sale.client_name ?? "Client comptoir", revenue: 0, salesCount: 0 };
      current.revenue += num(sale.total); current.salesCount += 1; totals.set(key, current);
    });
    return { tool, data: [...totals.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 10), period: { from, to }, sources: ["ventes.client_id", "ventes.client_name", "ventes.total"] };
  }
  if (tool === "margin_profit") {
    const { from, to } = parsePeriods(message);
    const { data, error } = await ctx.client.from("vente_items")
      .select("qty, selling_price, cost_price, ventes!inner(tenant_id, created_at)")
      .eq("ventes.tenant_id", ctx.tenantId).gte("ventes.created_at", from).lt("ventes.created_at", to);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    const revenue = rows.reduce((s, x) => s + num(x.qty) * num(x.selling_price), 0);
    const costs = rows.reduce((s, x) => s + num(x.qty) * num(x.cost_price), 0);
    const hasCosts = rows.some((x) => num(x.cost_price) > 0);
    return { tool, data: { revenue, costs: hasCosts ? costs : null, profit: hasCosts ? revenue - costs : null, marginPercent: hasCosts && revenue ? ((revenue - costs) / revenue) * 100 : null, costsAvailable: hasCosts }, period: { from, to }, sources: ["vente_items.qty", "vente_items.selling_price", "vente_items.cost_price"] };
  }
  if (tool === "compare_periods") {
    const dates = [...message.matchAll(/\d{4}-\d{2}-\d{2}/g)].map((m) => m[0]);
    if (dates.length < 4) throw new Error("Indiquez quatre dates (début et fin de chaque période) au format AAAA-MM-JJ.");
    const ranges = [[dates[0], dates[1]], [dates[2], dates[3]]] as const;
    const values = await Promise.all(ranges.map(async ([from, to]) => {
      const rows = await salesBetween(ctx, `${from}T00:00:00.000Z`, `${to}T23:59:59.999Z`);
      return { from, to, revenue: rows.reduce((s, x) => s + num(x.total), 0), salesCount: rows.length };
    }));
    return { tool, data: { periods: values, revenueDifference: values[1].revenue - values[0].revenue, revenueChangePercent: values[0].revenue ? ((values[1].revenue - values[0].revenue) / values[0].revenue) * 100 : null }, sources: ["ventes.total", "ventes.created_at"] };
  }
  const { from, to } = parsePeriods(message);
  const [sales, expenses] = await Promise.all([
    salesBetween(ctx, from, to),
    ctx.client.from("depenses").select("amount, paid_at").eq("tenant_id", ctx.tenantId).gte("paid_at", from.slice(0, 10)).lte("paid_at", to.slice(0, 10)),
  ]);
  if (expenses.error) throw new Error(expenses.error.message);
  const revenue = sales.reduce((s, x) => s + num(x.total), 0);
  const expenseTotal = (expenses.data ?? []).reduce((s, x) => s + num(x.amount), 0);
  return { tool, data: { revenue, expenses: expenseTotal, netCashResult: revenue - expenseTotal, salesCount: sales.length }, period: { from, to }, sources: ["ventes.total", "depenses.amount"] };
}

async function chooseIntent(message: string) {
  const provider = getAiProvider();
  const prompt = `Choisis exactement un tool autorisé pour cette demande ERP. Aucun SQL. Tools: ${[...readTools, ...writeTools].join(", ")}. Réponds JSON {"tool":"...","args":{...}}. Conserve dans args les champs explicitement donnés (name, phone, email, address, client_id, client_name, items[{service_id,name,qty,price}], category, amount, paid_at, payment_method, description, price, cost_price, stock, stock_alert_threshold, module_code). Demande: ${message}`;
  const generated = await provider.generateJson(prompt);
  const parsed = generated.data as {
    tool?: unknown;
    args?: unknown;
  };
  if (
    typeof parsed?.tool !== "string" ||
    !([...readTools, ...writeTools] as readonly string[]).includes(parsed.tool)
  ) {
    throw new Error(`Le fournisseur IA ${provider.name} a retourné un tool invalide.`);
  }
  return {
    tool: parsed.tool as ReadTool | WriteTool,
    args:
      typeof parsed.args === "object" && parsed.args !== null
        ? parsed.args as Record<string, unknown>
        : {},
    provider: provider.name,
    usage: generated.usage,
  };
}

async function audit(ctx: Context, action: string, metadata: Record<string, unknown>, entityId?: string) {
  const { error } = await (supabaseAdmin as any).from("audit_logs").insert({
    user_id: ctx.userId, role_id: ctx.roleId, action, module: "ai_assistant",
    entity_id: entityId, metadata: { tenant_id: ctx.tenantId, ...metadata },
  });
  if (error) throw new Error(`Journal d’audit indisponible: ${error.message}`);
}

export const askAssistant = createServerFn({ method: "POST" })
  .validator(requestSchema)
  .handler(async ({ data }) => {
    const ctx = await context();
    const { data: reservations, error: reservationError } = await (supabaseAdmin as any).rpc(
      "reserve_ai_request",
      {
        p_tenant_id: ctx.tenantId,
        p_user_id: ctx.userId,
        p_request_type: "intent_selection",
      },
    );
    if (reservationError) throw new Error(`Réservation du quota IA impossible: ${reservationError.message}`);
    const reservation = Array.isArray(reservations) ? reservations[0] : reservations;
    if (!reservation?.allowed) {
      const reset =
        reservation?.current_period_end
          ? ` Réinitialisation prévue le ${new Date(reservation.current_period_end).toLocaleString("fr-FR")}.`
          : "";
      throw new Error(`${reservation?.reason ?? "Accès à l’Assistant IA refusé."}${reset}`);
    }

    let intent: Awaited<ReturnType<typeof chooseIntent>>;
    try {
      intent = await chooseIntent(data.message);
      const { error: usageError } = await (supabaseAdmin as any)
        .from("ai_usage_logs")
        .update({
          tool_name: intent.tool,
          input_tokens: intent.usage.inputTokens,
          output_tokens: intent.usage.outputTokens,
          total_tokens: intent.usage.totalTokens,
          estimated_cost: null,
          status: "success",
        })
        .eq("id", reservation.usage_log_id)
        .eq("tenant_id", ctx.tenantId);
      if (usageError) throw new Error(`Journal d’usage IA indisponible: ${usageError.message}`);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Échec de l’appel au fournisseur IA.";
      await (supabaseAdmin as any)
        .from("ai_usage_logs")
        .update({ status: "error", error_message: message })
        .eq("id", reservation.usage_log_id)
        .eq("tenant_id", ctx.tenantId);
      throw cause;
    }
    requirePermission(ctx, intent.tool);
    if ((readTools as readonly string[]).includes(intent.tool)) {
      const result = await executeRead(ctx, intent.tool as ReadTool, data.message);
      await audit(ctx, `read.${intent.tool}`, { sources: result.sources });
      return { kind: "result" as const, ...result };
    }
    if (Object.keys(intent.args).length === 0) {
      return { kind: "error" as const, error: "Les informations nécessaires manquent. Indiquez les champs de l’action dans votre demande.", tool: intent.tool };
    }
    const { data: pending, error } = await (supabaseAdmin as any).from("ai_assistant_pending_actions")
      .insert({ tenant_id: ctx.tenantId, user_id: ctx.userId, action_type: intent.tool, payload: intent.args })
      .select("id, action_type, payload, expires_at").single();
    if (error) throw new Error(error.message);
    await audit(ctx, `prepare.${intent.tool}`, { pending_action_id: pending.id });
      return { kind: "confirmation" as const, pendingAction: pending };
  });

export type AssistantAccessState = {
  moduleEnabled: boolean;
  permissionGranted: boolean;
  planCode: string | null;
  planName: string | null;
  status: "trial" | "active" | "expired" | "suspended" | "cancelled" | null;
  monthlyRequestLimit: number | null;
  requestsUsed: number;
  remainingRequests: number | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  expiresAt: string | null;
  valid: boolean;
  quotaExhausted: boolean;
};

export const getAssistantAccessState = createServerFn({ method: "GET" })
  .handler(async (): Promise<AssistantAccessState> => {
    const ctx = await context(false);
    const { data, error } = await (supabaseAdmin as any).rpc("get_ai_subscription_state", {
      p_tenant_id: ctx.tenantId,
      p_user_id: ctx.userId,
    });
    if (error) throw new Error(error.message);
    const state = Array.isArray(data) ? data[0] : data;
    const limit = typeof state?.monthly_request_limit === "number"
      ? state.monthly_request_limit
      : null;
    const used = typeof state?.requests_used === "number" ? state.requests_used : 0;
    const moduleEnabled = Boolean(state?.module_enabled);
    const permissionGranted = Boolean(state?.permission_granted);
    const subscriptionValid = Boolean(state?.valid);
    return {
      moduleEnabled,
      permissionGranted,
      planCode: state?.plan_code ?? null,
      planName: state?.plan_name ?? null,
      status: state?.status ?? null,
      monthlyRequestLimit: limit,
      requestsUsed: used,
      remainingRequests: limit === null ? null : Math.max(0, limit - used),
      currentPeriodStart: state?.current_period_start ?? null,
      currentPeriodEnd: state?.current_period_end ?? null,
      expiresAt: state?.expires_at ?? null,
      valid: moduleEnabled && permissionGranted && subscriptionValid,
      quotaExhausted: Boolean(state?.quota_exhausted),
    };
  });

const actionSchemas = {
  create_client: z.object({ name: z.string().min(1), phone: z.string().optional(), email: z.string().email().optional(), address: z.string().optional(), notes: z.string().optional() }),
  create_expense: z.object({ category: z.string().min(1), amount: z.coerce.number().positive(), paid_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), payment_method: z.string().optional(), description: z.string().optional() }),
  create_product: z.object({ name: z.string().min(1), price: z.coerce.number().nonnegative(), cost_price: z.coerce.number().nonnegative().optional(), unit: z.string().optional(), stock: z.coerce.number().nonnegative().optional(), stock_alert_threshold: z.coerce.number().nonnegative().optional() }),
  create_quote: z.object({ client_id: z.string().uuid().optional(), client_name: z.string().optional(), due_date: z.string().optional(), notes: z.string().optional(), items: z.array(z.object({ service_id: z.string().uuid().optional(), name: z.string(), qty: z.coerce.number().positive(), price: z.coerce.number().nonnegative() })).min(1) }),
  create_invoice: z.object({ client_id: z.string().uuid().optional(), client_name: z.string().optional(), payment_method: z.string().optional(), items: z.array(z.object({ service_id: z.string().uuid().optional(), name: z.string(), qty: z.coerce.number().positive(), price: z.coerce.number().nonnegative() })).min(1) }),
  enable_module: z.object({ module_code: z.string().min(1) }),
} satisfies Record<WriteTool, z.ZodTypeAny>;

export const confirmAssistantAction = createServerFn({ method: "POST" })
  .validator(confirmSchema)
  .handler(async ({ data }) => {
    const ctx = await context();
    const { data: pending, error } = await (supabaseAdmin as any).from("ai_assistant_pending_actions")
      .select("*").eq("id", data.pendingActionId).eq("tenant_id", ctx.tenantId)
      .eq("user_id", ctx.userId).eq("status", "pending").single();
    if (error || !pending) throw new Error("Action en attente introuvable ou déjà traitée.");
    if (new Date(pending.expires_at) <= new Date()) {
      await (supabaseAdmin as any).from("ai_assistant_pending_actions").update({ status: "expired" }).eq("id", pending.id);
      throw new Error("La confirmation a expiré.");
    }
    const tool = pending.action_type as WriteTool;
    requirePermission(ctx, tool);
    if (!data.confirmed) {
      await (supabaseAdmin as any).from("ai_assistant_pending_actions").update({ status: "cancelled" }).eq("id", pending.id);
      await audit(ctx, `cancel.${tool}`, { pending_action_id: pending.id });
      return { success: true, cancelled: true };
    }
    const payload = actionSchemas[tool].parse(pending.payload) as any;
    let entityId = "";
    if (tool === "create_client") {
      const { data: row, error: e } = await ctx.client.from("clients").insert(payload).select("id").single(); if (e) throw new Error(e.message); entityId = row.id;
    } else if (tool === "create_expense") {
      const { data: row, error: e } = await ctx.client.from("depenses").insert(payload).select("id").single(); if (e) throw new Error(e.message); entityId = row.id;
    } else if (tool === "create_product") {
      const stock = payload.stock ?? 0;
      const { data: row, error: e } = await ctx.client.from("services").insert({ ...payload, type: "product", active: true, manage_stock: payload.stock !== undefined, stock: payload.stock !== undefined ? stock : null }).select("id").single(); if (e) throw new Error(e.message); entityId = row.id;
    } else if (tool === "enable_module") {
      const { data: module, error: mErr } = await supabaseAdmin.from("erp_modules").select("id").eq("code", payload.module_code).eq("is_active", true).single();
      if (mErr || !module) throw new Error("Module inconnu ou inactif.");
      const { error: e } = await supabaseAdmin.from("tenant_modules").upsert({ tenant_id: ctx.tenantId, module_id: module.id, enabled: true }); if (e) throw new Error(e.message); entityId = module.id;
    } else {
      const items = payload.items;
      const subtotal = items.reduce((s: number, x: any) => s + x.qty * x.price, 0);
      const number = `${tool === "create_quote" ? "DEV" : "FAC"}-${Date.now()}`;
      const table = tool === "create_quote" ? "devis" : "ventes";
      const header = tool === "create_quote"
        ? { number, client_id: payload.client_id, client_name: payload.client_name, due_date: payload.due_date, notes: payload.notes, subtotal, discount: 0, total: subtotal }
        : { number, client_id: payload.client_id, client_name: payload.client_name, payment_method: payload.payment_method ?? "Espèces", subtotal, discount: 0, total: subtotal };
      const { data: row, error: e } = await (ctx.client.from(table) as any).insert(header).select("id").single(); if (e) throw new Error(e.message); entityId = row.id;
      const itemTable = tool === "create_quote" ? "devis_items" : "vente_items";
      const parentKey = tool === "create_quote" ? "devis_id" : "vente_id";
      const rows = items.map((x: any) => ({
        [parentKey]: entityId,
        service_id: x.service_id,
        name: x.name,
        qty: x.qty,
        price: x.price,
        line_total: x.qty * x.price,
        ...(tool === "create_invoice" ? { selling_price: x.price } : {}),
      }));
      const { error: itemError } = await (ctx.client.from(itemTable) as any).insert(rows); if (itemError) throw new Error(itemError.message);
    }
    await (supabaseAdmin as any).from("ai_assistant_pending_actions").update({ status: "executed", executed_at: new Date().toISOString() }).eq("id", pending.id);
    await audit(ctx, `execute.${tool}`, { pending_action_id: pending.id }, entityId);
    return { success: true, cancelled: false, action: tool, entityId };
  });

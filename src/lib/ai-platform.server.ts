import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AuthHttpError, requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { formatSupabaseError } from "@/lib/supabase-error";

export type AiProvider = "openai" | "anthropic" | "google" | "mistral" | "ollama";
export type AiModel = {
  id: string; provider: AiProvider; name: string; modelKey: string;
  inputCost: number; outputCost: number; contextWindow: number | null; isActive: boolean;
};
export type AiAgent = {
  id: string; name: string; code: string; description: string; modelId: string | null;
  systemPrompt: string; temperature: number; isActive: boolean; moduleIds: string[]; planCodes: string[];
};
export type AiPlatformData = {
  agents: AiAgent[];
  models: AiModel[];
  modules: { id: string; code: string; name: string }[];
  plans: { code: string; name: string; price: number | null; enabled: boolean }[];
  quotas: { planCode: string; monthlyRequests: number; monthlyTokens: number; includedCredits: number; maxAgents: number | null }[];
  usage: { id: string; tenantId: string; tenantName: string; requestType: string; toolName: string | null; tokens: number; cost: number; status: string; error: string | null; createdAt: string }[];
  settings: { defaultModelId: string | null; loggingEnabled: boolean; retentionDays: number; monthlyBudget: number | null };
  stats: { requests: number; tokens: number; cost: number; errors: number; activeAgents: number };
};

async function adminContext(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.from("platform_admins").select("user_id").eq("user_id", context.userId).maybeSingle();
  if (error) throw new Error(formatSupabaseError(error));
  if (!data) throw new AuthHttpError(403, "Accès refusé : super administrateur de plateforme requis.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as any;
}

async function query(client: any, table: string, columns = "*") {
  const { data, error } = await client.from(table).select(columns);
  if (error) throw new Error(formatSupabaseError(error));
  return data ?? [];
}

export const getAiPlatform = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AiPlatformData> => {
    const db = await adminContext(context);
    const [agentRows, modelRows, moduleRows, planRows, quotaRows, moduleLinks, planLinks, usageRows, tenantRows, settingsRows] = await Promise.all([
      query(db, "ai_agents"), query(db, "ai_models"), query(db, "erp_modules", "id,code,name"),
      query(db, "ai_plans", "code,name,price,enabled"), query(db, "ai_plan_quotas"),
      query(db, "ai_agent_modules"), query(db, "ai_agent_plans"),
      query(db, "ai_usage_logs", "id,tenant_id,request_type,tool_name,total_tokens,estimated_cost,status,error_message,created_at"),
      query(db, "tenants", "id,name"), query(db, "ai_platform_settings"),
    ]);
    const tenants = new Map(tenantRows.map((row: any) => [row.id, row.name]));
    const usage = usageRows
      .sort((a: any, b: any) => b.created_at.localeCompare(a.created_at))
      .map((row: any) => ({
        id: row.id, tenantId: row.tenant_id, tenantName: tenants.get(row.tenant_id) ?? "Tenant",
        requestType: row.request_type, toolName: row.tool_name, tokens: Number(row.total_tokens) || 0,
        cost: Number(row.estimated_cost) || 0, status: row.status, error: row.error_message, createdAt: row.created_at,
      }));
    const models = modelRows.map((row: any) => ({
      id: row.id, provider: row.provider, name: row.name, modelKey: row.model_key,
      inputCost: Number(row.input_cost_per_million), outputCost: Number(row.output_cost_per_million),
      contextWindow: row.context_window, isActive: row.is_active,
    }));
    const agents = agentRows.map((row: any) => ({
      id: row.id, name: row.name, code: row.code, description: row.description ?? "", modelId: row.model_id,
      systemPrompt: row.system_prompt ?? "", temperature: Number(row.temperature), isActive: row.is_active,
      moduleIds: moduleLinks.filter((link: any) => link.agent_id === row.id).map((link: any) => link.module_id),
      planCodes: planLinks.filter((link: any) => link.agent_id === row.id).map((link: any) => link.plan_code),
    }));
    const settings = settingsRows[0] ?? {};
    return {
      agents, models,
      modules: moduleRows,
      plans: planRows.map((row: any) => ({ ...row, price: row.price === null ? null : Number(row.price) })),
      quotas: quotaRows.map((row: any) => ({
        planCode: row.plan_code, monthlyRequests: row.monthly_requests, monthlyTokens: Number(row.monthly_tokens),
        includedCredits: Number(row.included_credits), maxAgents: row.max_agents,
      })),
      usage,
      settings: { defaultModelId: settings.default_model_id ?? null, loggingEnabled: settings.logging_enabled ?? true, retentionDays: settings.retention_days ?? 90, monthlyBudget: settings.monthly_budget === null || settings.monthly_budget === undefined ? null : Number(settings.monthly_budget) },
      stats: {
        requests: usage.length, tokens: usage.reduce((sum: number, row: any) => sum + row.tokens, 0),
        cost: usage.reduce((sum: number, row: any) => sum + row.cost, 0),
        errors: usage.filter((row: any) => row.status === "error").length,
        activeAgents: agents.filter((agent: any) => agent.isActive).length,
      },
    };
  });

const agentSchema = z.object({
  id: z.string().uuid().optional(), name: z.string().trim().min(2).max(100),
  code: z.string().trim().regex(/^[a-z0-9_]+$/), description: z.string().max(1000).default(""),
  modelId: z.string().uuid().nullable(), systemPrompt: z.string().max(12000).default(""),
  temperature: z.number().min(0).max(2), isActive: z.boolean(),
  moduleIds: z.array(z.string().uuid()), planCodes: z.array(z.string().min(1)),
});

export const saveAiAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).validator(agentSchema)
  .handler(async ({ context, data }) => {
    const db = await adminContext(context);
    const payload = { name: data.name, code: data.code, description: data.description, model_id: data.modelId, system_prompt: data.systemPrompt, temperature: data.temperature, is_active: data.isActive };
    const result = data.id
      ? await db.from("ai_agents").update(payload).eq("id", data.id).select("id").single()
      : await db.from("ai_agents").insert(payload).select("id").single();
    if (result.error) throw new Error(formatSupabaseError(result.error));
    const id = result.data.id;
    await Promise.all([db.from("ai_agent_modules").delete().eq("agent_id", id), db.from("ai_agent_plans").delete().eq("agent_id", id)]);
    if (data.moduleIds.length) {
      const { error } = await db.from("ai_agent_modules").insert(data.moduleIds.map((moduleId) => ({ agent_id: id, module_id: moduleId })));
      if (error) throw new Error(formatSupabaseError(error));
    }
    if (data.planCodes.length) {
      const { error } = await db.from("ai_agent_plans").insert(data.planCodes.map((planCode) => ({ agent_id: id, plan_code: planCode })));
      if (error) throw new Error(formatSupabaseError(error));
    }
    return { id };
  });

export const deleteAiAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ context, data }) => {
    const db = await adminContext(context);
    const { error } = await db.from("ai_agents").delete().eq("id", data.id);
    if (error) throw new Error(formatSupabaseError(error));
    return { success: true };
  });

export const setAiAgentStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).validator(z.object({ id: z.string().uuid(), isActive: z.boolean() }))
  .handler(async ({ context, data }) => {
    const db = await adminContext(context);
    const { error } = await db.from("ai_agents").update({ is_active: data.isActive }).eq("id", data.id);
    if (error) throw new Error(formatSupabaseError(error));
    return { success: true };
  });

export const saveAiModel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).validator(z.object({
    id: z.string().uuid().optional(), provider: z.enum(["openai", "anthropic", "google", "mistral", "ollama"]),
    name: z.string().min(2), modelKey: z.string().min(2), inputCost: z.number().min(0), outputCost: z.number().min(0),
    contextWindow: z.number().int().positive().nullable(), isActive: z.boolean(),
  })).handler(async ({ context, data }) => {
    const db = await adminContext(context);
    const payload = { provider: data.provider, name: data.name, model_key: data.modelKey, input_cost_per_million: data.inputCost, output_cost_per_million: data.outputCost, context_window: data.contextWindow, is_active: data.isActive };
    const result = data.id ? await db.from("ai_models").update(payload).eq("id", data.id) : await db.from("ai_models").insert(payload);
    if (result.error) throw new Error(formatSupabaseError(result.error));
    return { success: true };
  });

export const saveAiQuota = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).validator(z.object({
    planCode: z.string(), monthlyRequests: z.number().int().positive(), monthlyTokens: z.number().int().positive(),
    includedCredits: z.number().min(0), maxAgents: z.number().int().positive().nullable(),
  })).handler(async ({ context, data }) => {
    const db = await adminContext(context);
    const { error } = await db.from("ai_plan_quotas").upsert({ plan_code: data.planCode, monthly_requests: data.monthlyRequests, monthly_tokens: data.monthlyTokens, included_credits: data.includedCredits, max_agents: data.maxAgents });
    if (error) throw new Error(formatSupabaseError(error));
    return { success: true };
  });

export const saveAiSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).validator(z.object({
    defaultModelId: z.string().uuid().nullable(), loggingEnabled: z.boolean(), retentionDays: z.number().int().min(1).max(3650), monthlyBudget: z.number().min(0).nullable(),
  })).handler(async ({ context, data }) => {
    const db = await adminContext(context);
    const { error } = await db.from("ai_platform_settings").upsert({ id: true, default_model_id: data.defaultModelId, logging_enabled: data.loggingEnabled, retention_days: data.retentionDays, monthly_budget: data.monthlyBudget });
    if (error) throw new Error(formatSupabaseError(error));
    return { success: true };
  });

export type TenantAiPortal = {
  planCode: string | null;
  agents: { id: string; name: string; description: string; provider: string | null; model: string | null; enabled: boolean }[];
  usage: { id: string; requestType: string; toolName: string | null; tokens: number; cost: number; status: string; error: string | null; createdAt: string }[];
  requestsUsed: number;
  requestLimit: number | null;
  tokensUsed: number;
  cost: number;
  creditBalance: number;
};

async function tenantContext(context: { supabase: any; userId: string }) {
  const { data: profile, error } = await context.supabase.from("profiles").select("tenant_id").eq("id", context.userId).single();
  if (error || !profile?.tenant_id) throw new Error("Tenant introuvable.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { db: supabaseAdmin as any, tenantId: profile.tenant_id as string };
}

export const getTenantAiPortal = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth]).handler(async ({ context }): Promise<TenantAiPortal> => {
    const { db, tenantId } = await tenantContext(context);
    const { data: subscription } = await db.from("tenant_ai_subscriptions").select("plan_code,requests_used,monthly_request_limit").eq("tenant_id", tenantId).maybeSingle();
    const [{ data: usage }, { data: agents }, { data: enabled }, { data: credits }] = await Promise.all([
      db.from("ai_usage_logs").select("id,request_type,tool_name,total_tokens,estimated_cost,status,error_message,created_at").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(250),
      db.from("ai_agents").select("id,name,description,model_id,ai_models(provider,name),ai_agent_plans!inner(plan_code)").eq("is_active", true).eq("ai_agent_plans.plan_code", subscription?.plan_code ?? "__none__"),
      db.from("tenant_ai_agents").select("agent_id,enabled").eq("tenant_id", tenantId),
      db.from("tenant_ai_credit_transactions").select("amount").eq("tenant_id", tenantId),
    ]);
    const enabledMap = new Map((enabled ?? []).map((row: any) => [row.agent_id, row.enabled]));
    const rows = (usage ?? []).map((row: any) => ({ id: row.id, requestType: row.request_type, toolName: row.tool_name, tokens: Number(row.total_tokens) || 0, cost: Number(row.estimated_cost) || 0, status: row.status, error: row.error_message, createdAt: row.created_at }));
    return {
      planCode: subscription?.plan_code ?? null,
      agents: (agents ?? []).map((row: any) => ({ id: row.id, name: row.name, description: row.description ?? "", provider: row.ai_models?.provider ?? null, model: row.ai_models?.name ?? null, enabled: enabledMap.get(row.id) === true })),
      usage: rows, requestsUsed: subscription?.requests_used ?? rows.length,
      requestLimit: subscription?.monthly_request_limit ?? null,
      tokensUsed: rows.reduce((sum: number, row: any) => sum + row.tokens, 0),
      cost: rows.reduce((sum: number, row: any) => sum + row.cost, 0),
      creditBalance: (credits ?? []).reduce((sum: number, row: any) => sum + Number(row.amount), 0),
    };
  });

export const toggleTenantAiAgent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).validator(z.object({ agentId: z.string().uuid(), enabled: z.boolean() }))
  .handler(async ({ context, data }) => {
    const { db, tenantId } = await tenantContext(context);
    const { data: subscription } = await db.from("tenant_ai_subscriptions").select("plan_code,status").eq("tenant_id", tenantId).maybeSingle();
    if (!subscription || !["active", "trial"].includes(subscription.status)) throw new Error("Un abonnement IA actif est requis.");
    const { data: allowed } = await db.from("ai_agent_plans").select("agent_id").eq("agent_id", data.agentId).eq("plan_code", subscription.plan_code).maybeSingle();
    if (!allowed) throw new Error("Cet agent n’est pas inclus dans votre abonnement.");
    const { error } = await db.from("tenant_ai_agents").upsert({ tenant_id: tenantId, agent_id: data.agentId, enabled: data.enabled });
    if (error) throw new Error(formatSupabaseError(error));
    return { success: true };
  });

export const purchaseTenantAiCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth]).validator(z.object({ amount: z.number().min(5).max(10000) }))
  .handler(async ({ context, data }) => {
    const { db, tenantId } = await tenantContext(context);
    const { error } = await db.from("tenant_ai_credit_transactions").insert({ tenant_id: tenantId, amount: data.amount, transaction_type: "purchase", description: "Achat de crédits depuis Assistant IA" });
    if (error) throw new Error(formatSupabaseError(error));
    return { success: true };
  });

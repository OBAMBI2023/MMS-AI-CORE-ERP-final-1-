import { createServerFn } from "@tanstack/react-start";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { AuthHttpError, requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { readEnvVar } from "@/integrations/supabase/env";
import { formatSupabaseError } from "@/lib/supabase-error";

const kinds = ["gemini", "openai", "groq", "anthropic", "ollama"] as const;
export type ProviderKind = typeof kinds[number];
export type ControlCenterData = Awaited<ReturnType<typeof loadData>>;

async function admin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.from("platform_admins").select("user_id").eq("user_id", context.userId).maybeSingle();
  if (error) throw new Error(formatSupabaseError(error));
  if (!data) throw new AuthHttpError(403, "Accès refusé : super administrateur de plateforme requis.");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { db: supabaseAdmin as any, userId: context.userId };
}

async function rows(db: any, table: string, select = "*") {
  const result = await db.from(table).select(select);
  if (result.error) throw new Error(formatSupabaseError(result.error));
  return result.data ?? [];
}

async function loadData(db: any) {
  const [providers, secrets, models, agents, modules, links, assignments, tenants, usage, profiles, subscriptions, credits, settingsRows] = await Promise.all([
    rows(db, "ai_providers"), rows(db, "ai_provider_secrets", "provider_id,key_hint,rotated_at"), rows(db, "ai_models"), rows(db, "ai_agents"),
    rows(db, "erp_modules", "id,code,name"), rows(db, "ai_agent_modules"), rows(db, "tenant_ai_agents"), rows(db, "tenants", "id,name"),
    rows(db, "ai_usage_logs", "id,tenant_id,user_id,agent_id,provider,model,total_tokens,estimated_cost,duration_ms,status,error_message,created_at"),
    rows(db, "profiles", "id,full_name,email"), rows(db, "tenant_ai_subscriptions"), rows(db, "tenant_ai_credit_transactions", "tenant_id,amount"), rows(db, "ai_platform_settings"),
  ]);
  const secretMap = new Map<string, any>(secrets.map((x: any) => [x.provider_id, x]));
  const tenantMap = new Map(tenants.map((x: any) => [x.id, x.name]));
  const profileMap = new Map(profiles.map((x: any) => [x.id, x.full_name || x.email || "Utilisateur"]));
  const agentMap = new Map(agents.map((x: any) => [x.id, x.name]));
  const modelMap = new Map(models.map((x: any) => [x.id, x.name]));
  const subscriptionMap = new Map<string, any>(subscriptions.map((x: any) => [x.tenant_id, x]));
  const creditMap = new Map<string, number>(); credits.forEach((x: any) => creditMap.set(x.tenant_id, (creditMap.get(x.tenant_id) ?? 0) + Number(x.amount)));
  const logs = usage.sort((a: any,b: any) => b.created_at.localeCompare(a.created_at)).map((x: any) => ({ ...x, tenantName: tenantMap.get(x.tenant_id) ?? "Tenant", userName: profileMap.get(x.user_id) ?? "Utilisateur", agentName: agentMap.get(x.agent_id) ?? "Assistant IA", tokens: Number(x.total_tokens)||0, cost: Number(x.estimated_cost)||0 }));
  const today = new Date().toISOString().slice(0,10); const todayLogs = logs.filter((x:any)=>x.created_at.startsWith(today));
  const settings = settingsRows[0] ?? {};
  return {
    providers: providers.map((x:any)=>({ ...x, hasSecret: secretMap.has(x.id), keyHint: secretMap.get(x.id)?.key_hint ?? null, rotatedAt: secretMap.get(x.id)?.rotated_at ?? null })),
    models, modules,
    agents: agents.map((x:any)=>({ ...x, moduleIds: links.filter((l:any)=>l.agent_id===x.id).map((l:any)=>l.module_id) })),
    assignments: assignments.map((x:any)=>{ const sub=subscriptionMap.get(x.tenant_id); return {...x, tenantName:tenantMap.get(x.tenant_id), agentName:agentMap.get(x.agent_id), modelName:modelMap.get(x.model_id), subscription:sub?.plan_code??null, expiresAt:sub?.expires_at??null, credits:creditMap.get(x.tenant_id)??0}; }),
    tenants, logs,
    settings: { defaultProviderId: settings.default_provider_id ?? null, defaultModelId: settings.default_model_id ?? null, fallbackProviderId: settings.fallback_provider_id ?? null, timeout: settings.global_timeout_ms ?? 30000, dailyLimit: settings.daily_limit ?? null, monthlyBudget: settings.monthly_budget == null ? null : Number(settings.monthly_budget), alerts: settings.alerts_enabled ?? true, retentionDays: settings.retention_days ?? 90, maintenance: settings.maintenance_mode ?? false },
    stats: { activeProviders: providers.filter((x:any)=>x.is_active).length, activeAgents: agents.filter((x:any)=>x.is_active).length, requests: todayLogs.length, tokens: todayLogs.reduce((s:number,x:any)=>s+x.tokens,0), cost: todayLogs.reduce((s:number,x:any)=>s+x.cost,0), successRate: todayLogs.length ? todayLogs.filter((x:any)=>x.status==="success").length/todayLogs.length*100 : 100, errors: todayLogs.filter((x:any)=>x.status==="error").slice(0,5) },
  };
}

export const getAiControlCenter = createServerFn({method:"GET"}).middleware([requireSupabaseAuth]).handler(async({context})=>loadData((await admin(context)).db));

const providerSchema=z.object({id:z.string().uuid().optional(),name:z.string().trim().min(2).max(80),provider:z.enum(kinds),apiKey:z.string().trim().min(8).optional(),baseUrl:z.string().url().optional().or(z.literal("")),defaultModel:z.string().max(160).optional(),timeout:z.number().int().min(1000).max(300000),active:z.boolean(),primary:z.boolean(),fallbackOrder:z.number().int().min(0)});
function secretKey(){ const raw=readEnvVar("AI_SECRETS_ENCRYPTION_KEY"); if(!raw) throw new Error("AI_SECRETS_ENCRYPTION_KEY doit être configurée côté serveur."); return createHash("sha256").update(raw).digest(); }
function encrypt(value:string){const iv=randomBytes(12), cipher=createCipheriv("aes-256-gcm",secretKey(),iv); const body=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]); return `${iv.toString("base64")}.${cipher.getAuthTag().toString("base64")}.${body.toString("base64")}`;}
function decrypt(value:string){const [i,t,b]=value.split("."); const decipher=createDecipheriv("aes-256-gcm",secretKey(),Buffer.from(i,"base64")); decipher.setAuthTag(Buffer.from(t,"base64")); return Buffer.concat([decipher.update(Buffer.from(b,"base64")),decipher.final()]).toString("utf8");}

export const saveAiProvider=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).validator(providerSchema).handler(async({context,data})=>{
  const {db,userId}=await admin(context); if(data.primary) await db.from("ai_providers").update({is_primary:false}).eq("is_primary",true);
  const payload={name:data.name,provider:data.provider,base_url:data.baseUrl||null,default_model:data.defaultModel||null,timeout_ms:data.timeout,is_active:data.active,is_primary:data.primary,fallback_order:data.fallbackOrder};
  const result=data.id?await db.from("ai_providers").update(payload).eq("id",data.id).select("id").single():await db.from("ai_providers").insert(payload).select("id").single();
  if(result.error) throw new Error(formatSupabaseError(result.error)); const id=result.data.id;
  if(data.apiKey){const key=data.apiKey; const s=await db.from("ai_provider_secrets").upsert({provider_id:id,encrypted_secret:encrypt(key),key_hint:`••••${key.slice(-4)}`,rotated_at:new Date().toISOString(),rotated_by:userId});if(s.error)throw new Error(formatSupabaseError(s.error));}
  await db.from("ai_security_audit_logs").insert({actor_id:userId,provider_id:id,action:data.id?(data.apiKey?"provider.key_rotated":"provider.updated"):"provider.created",metadata:{provider:data.provider}}); return {id};
});

export const setAiProviderActive=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).validator(z.object({id:z.string().uuid(),active:z.boolean()})).handler(async({context,data})=>{const {db,userId}=await admin(context);const r=await db.from("ai_providers").update({is_active:data.active}).eq("id",data.id);if(r.error)throw new Error(formatSupabaseError(r.error));await db.from("ai_security_audit_logs").insert({actor_id:userId,provider_id:data.id,action:data.active?"provider.activated":"provider.deactivated"});return{success:true};});

async function testCall(p:any,key:string){const timeout=AbortSignal.timeout(p.timeout_ms);if(p.provider==="gemini"){const u=`${p.base_url||"https://generativelanguage.googleapis.com/v1beta"}/models/${p.default_model||"gemini-2.5-flash"}:generateContent?key=${encodeURIComponent(key)}`;return fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({contents:[{parts:[{text:"Réponds OK"}]}],generationConfig:{maxOutputTokens:4}}),signal:timeout});} if(p.provider==="anthropic")return fetch(`${p.base_url||"https://api.anthropic.com/v1"}/messages`,{method:"POST",headers:{"content-type":"application/json","x-api-key":key,"anthropic-version":"2023-06-01"},body:JSON.stringify({model:p.default_model||"claude-sonnet-4-5",max_tokens:4,messages:[{role:"user",content:"OK"}]}),signal:timeout}); const base=p.base_url||(p.provider==="groq"?"https://api.groq.com/openai/v1":p.provider==="ollama"?"http://127.0.0.1:11434/v1":"https://api.openai.com/v1");return fetch(`${base}/chat/completions`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${key}`},body:JSON.stringify({model:p.default_model||"gpt-4o-mini",max_tokens:4,messages:[{role:"user",content:"OK"}]}),signal:timeout});}
export const testAiProvider=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).validator(z.object({id:z.string().uuid()})).handler(async({context,data})=>{const {db,userId}=await admin(context);const [p,s]=await Promise.all([db.from("ai_providers").select("*").eq("id",data.id).single(),db.from("ai_provider_secrets").select("encrypted_secret").eq("provider_id",data.id).single()]);if(p.error||s.error)throw new Error("Provider ou clé introuvable.");const started=Date.now();const response=await testCall(p.data,decrypt(s.data.encrypted_secret));const body=await response.text();await db.from("ai_security_audit_logs").insert({actor_id:userId,provider_id:data.id,action:"provider.connection_tested",metadata:{ok:response.ok,status:response.status,duration_ms:Date.now()-started}});if(!response.ok)throw new Error(`Connexion refusée (${response.status}) : ${body.slice(0,180)}`);return{success:true,duration:Date.now()-started};});

export const saveTenantAssignment=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).validator(z.object({tenantId:z.string().uuid(),agentId:z.string().uuid(),providerId:z.string().uuid().nullable(),modelId:z.string().uuid().nullable(),monthlyQuota:z.number().int().min(0).nullable(),moduleIds:z.array(z.string().uuid()),enabled:z.boolean()})).handler(async({context,data})=>{const{db}=await admin(context);const r=await db.from("tenant_ai_agents").upsert({tenant_id:data.tenantId,agent_id:data.agentId,provider_id:data.providerId,model_id:data.modelId,monthly_quota:data.monthlyQuota,module_ids:data.moduleIds,enabled:data.enabled,suspended_at:data.enabled?null:new Date().toISOString()});if(r.error)throw new Error(formatSupabaseError(r.error));return{success:true};});

export const saveControlSettings=createServerFn({method:"POST"}).middleware([requireSupabaseAuth]).validator(z.object({defaultProviderId:z.string().uuid().nullable(),defaultModelId:z.string().uuid().nullable(),fallbackProviderId:z.string().uuid().nullable(),timeout:z.number().int().min(1000),dailyLimit:z.number().int().positive().nullable(),monthlyBudget:z.number().min(0).nullable(),alerts:z.boolean(),retentionDays:z.number().int().min(1).max(3650),maintenance:z.boolean()})).handler(async({context,data})=>{const{db}=await admin(context);const r=await db.from("ai_platform_settings").upsert({id:true,default_provider_id:data.defaultProviderId,default_model_id:data.defaultModelId,fallback_provider_id:data.fallbackProviderId,global_timeout_ms:data.timeout,daily_limit:data.dailyLimit,monthly_budget:data.monthlyBudget,alerts_enabled:data.alerts,retention_days:data.retentionDays,maintenance_mode:data.maintenance});if(r.error)throw new Error(formatSupabaseError(r.error));return{success:true};});

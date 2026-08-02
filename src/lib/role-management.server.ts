import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAuth } from "@/lib/auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { formatSupabaseError } from "@/lib/supabase-error";

async function adminContext() {
  const { user } = await getAuth();
  const { data, error } = await (supabaseAdmin as any).from("profiles").select("tenant_id, roles!inner(name, tenant_id)").eq("id", user.id).single();
  if (error) throw new Error(formatSupabaseError(error));
  if (!data?.tenant_id || data.roles?.name !== "Administrateur" || data.roles?.tenant_id !== data.tenant_id) throw new Error("Accès refusé : administrateur du tenant requis.");
  return data.tenant_id as string;
}

const input = z.object({ id: z.string().uuid().optional(), name: z.string().trim().min(2).max(80), description: z.string().trim().max(300).optional(), permissionIds: z.array(z.string().uuid()).max(500) });
export const saveTenantRole = createServerFn({ method: "POST" }).validator(input).handler(async ({ data }) => {
  const tenantId = await adminContext();
  let roleId = data.id;
  if (roleId) {
    const { data: role } = await (supabaseAdmin as any).from("roles").select("name").eq("id", roleId).eq("tenant_id", tenantId).single();
    if (!role) throw new Error("Rôle introuvable dans le tenant actif.");
    if (role.name === "Administrateur") throw new Error("Le rôle Administrateur est protégé.");
    const { error } = await (supabaseAdmin as any).from("roles").update({ name: data.name, description: data.description || null }).eq("id", roleId).eq("tenant_id", tenantId);
    if (error) throw new Error(formatSupabaseError(error));
  } else {
    const { data: role, error } = await (supabaseAdmin as any).from("roles").insert({ tenant_id: tenantId, name: data.name, description: data.description || null }).select("id").single();
    if (error) throw new Error(formatSupabaseError(error));
    roleId = role.id;
  }
  const { data: allowed, error: permissionError } = await (supabaseAdmin as any).from("permissions").select("id").in("id", data.permissionIds.length ? data.permissionIds : ["00000000-0000-0000-0000-000000000000"]);
  if (permissionError || (allowed?.length ?? 0) !== data.permissionIds.length) throw new Error("Une permission sélectionnée est invalide.");
  const { error: deleteError } = await (supabaseAdmin as any).from("role_permissions").delete().eq("role_id", roleId);
  if (deleteError) throw new Error(formatSupabaseError(deleteError));
  if (data.permissionIds.length) {
    const { error } = await (supabaseAdmin as any).from("role_permissions").insert(data.permissionIds.map((permission_id) => ({ role_id: roleId, permission_id })));
    if (error) throw new Error(formatSupabaseError(error));
  }
  return { id: roleId };
});

export const duplicateTenantRole = createServerFn({ method: "POST" }).validator(z.object({ id: z.string().uuid() })).handler(async ({ data }) => {
  const tenantId = await adminContext();
  const { data: source, error: sourceError } = await (supabaseAdmin as any).from("roles").select("name, description, role_permissions(permission_id)").eq("id", data.id).eq("tenant_id", tenantId).single();
  if (sourceError) throw new Error(formatSupabaseError(sourceError));
  if (!source) throw new Error("Rôle source introuvable.");
  if (source.name === "Administrateur") throw new Error("Le rôle Administrateur est protégé.");
  let name = `${source.name} (copie)`;
  for (let index = 2; ; index += 1) {
    const { data: found } = await (supabaseAdmin as any).from("roles").select("id").eq("tenant_id", tenantId).eq("name", name).maybeSingle();
    if (!found) break;
    name = `${source.name} (copie ${index})`;
  }
  const { data: role, error } = await (supabaseAdmin as any).from("roles").insert({ tenant_id: tenantId, name, description: source.description }).select("id").single();
  if (error) throw new Error(formatSupabaseError(error));
  const ids = (source.role_permissions ?? []).map((item: any) => item.permission_id);
  if (ids.length) {
    const { error: permissionsError } = await (supabaseAdmin as any).from("role_permissions").insert(ids.map((permission_id: string) => ({ role_id: role.id, permission_id })));
    if (permissionsError) {
      await (supabaseAdmin as any).from("roles").delete().eq("id", role.id).eq("tenant_id", tenantId);
      throw new Error(formatSupabaseError(permissionsError));
    }
  }
  return { id: role.id };
});

export const setTenantRoleActive = createServerFn({ method: "POST" }).validator(z.object({ id: z.string().uuid(), active: z.boolean() })).handler(async ({ data }) => {
  const tenantId = await adminContext();
  const { data: role } = await (supabaseAdmin as any).from("roles").select("name").eq("id", data.id).eq("tenant_id", tenantId).single();
  if (!role) throw new Error("Rôle introuvable.");
  if (role.name === "Administrateur" && !data.active) throw new Error("Le rôle Administrateur est protégé.");
  const { error } = await (supabaseAdmin as any).from("roles").update({ is_active: data.active }).eq("id", data.id).eq("tenant_id", tenantId);
  if (error) throw new Error(formatSupabaseError(error));
  return { success: true };
});

export const deleteTenantRole = createServerFn({ method: "POST" }).validator(z.object({ id: z.string().uuid() })).handler(async ({ data }) => {
  const tenantId = await adminContext();
  const { data: role } = await (supabaseAdmin as any).from("roles").select("name").eq("id", data.id).eq("tenant_id", tenantId).single();
  if (!role) throw new Error("Rôle introuvable.");
  if (role.name === "Administrateur") throw new Error("Le rôle Administrateur est protégé.");
  const { count, error: countError } = await (supabaseAdmin as any).from("profiles").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("role_id", data.id);
  if (countError) throw new Error(formatSupabaseError(countError));
  if ((count ?? 0) > 0) throw new Error("Ce rôle est attribué à un ou plusieurs utilisateurs.");
  const { error } = await (supabaseAdmin as any).from("roles").delete().eq("id", data.id).eq("tenant_id", tenantId);
  if (error) throw new Error(formatSupabaseError(error));
  return { success: true };
});

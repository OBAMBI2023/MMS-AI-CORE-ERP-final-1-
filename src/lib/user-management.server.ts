import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAuth } from "@/lib/auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAction } from "@/lib/audit.server";
import { formatSupabaseError } from "@/lib/supabase-error";

const TENANT_ROLE_NAMES = [
  "Administrateur", "Gérant", "Manager", "Comptable",
  "Commercial", "Caissier", "Employé",
] as const;

// L'UI affiche des libellés français ("Actif", "Désactivé") mais la contrainte
// profiles_status_check n'accepte que les valeurs canoniques anglaises.
const STATUS_UI_TO_DB = {
  actif: "active",
  suspendu: "suspended",
} as const satisfies Record<string, string>;

type StatusUi = keyof typeof STATUS_UI_TO_DB;

function toDbStatus(status: StatusUi): (typeof STATUS_UI_TO_DB)[StatusUi] {
  return STATUS_UI_TO_DB[status];
}

async function logRejectedPrivilegeAttempt(
  actorId: string,
  reason: string,
  metadata: Record<string, unknown>,
) {
  await logAction(actorId, null, "Élévation de privilèges refusée", "security", {
    reason,
    ...metadata,
  });
}

async function getAdminTenantContext() {
  const { user } = await getAuth();

  const { data: profile, error } = await (supabaseAdmin as any)
    .from("profiles")
    .select("tenant_id, role_id, roles!inner(name, tenant_id)")
    .eq("id", user.id)
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  if (
    !profile?.tenant_id ||
    profile.roles?.name !== "Administrateur" ||
    profile.roles?.tenant_id !== profile.tenant_id
  ) {
    throw new Error("Accès refusé : administrateur du tenant requis.");
  }

  return { user, tenantId: profile.tenant_id as string };
}

async function assertProfileInTenant(profileId: string, tenantId: string) {
  const { data, error } = await (supabaseAdmin as any)
    .from("profiles")
    .select("id, name")
    .eq("id", profileId)
    .eq("tenant_id", tenantId)
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  if (!data) throw new Error("Utilisateur introuvable dans le tenant actif.");
}

async function assertRoleInTenant(roleId: string, tenantId: string) {
  const { data, error } = await (supabaseAdmin as any)
    .from("roles")
    .select("id, name")
    .eq("id", roleId)
    .eq("tenant_id", tenantId)
    .single();

  if (error) throw new Error(formatSupabaseError(error));
  if (!data || !TENANT_ROLE_NAMES.includes(data.name)) {
    throw new Error("Le rôle sélectionné n'est pas autorisé dans ce tenant.");
  }
}

export const deleteUser = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { user: admin, tenantId } = await getAdminTenantContext();

    if (admin.id === data.id) {
      throw new Error("Action non autorisée sur son propre compte.");
    }
    await assertProfileInTenant(data.id, tenantId);

    const { count, error: countError } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id, roles!inner(name)", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("status", "active")
      .eq("roles.name", "Administrateur")
      .neq("id", data.id);

    if (countError) throw new Error(formatSupabaseError(countError));
    if (count === 0) {
      throw new Error("Impossible de supprimer le dernier administrateur actif.");
    }

    await logAction(admin.id, null, "Suppression d'utilisateur", "utilisateurs", {
      targetUserId: data.id,
      tenantId,
    });

    const { error } = await (supabaseAdmin.auth.admin as any).deleteUser(data.id);
    if (error) throw new Error(formatSupabaseError(error));

    return { success: true };
  });

export const createUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      password: z.string().min(6),
      role_id: z.string().uuid(),
      full_name: z.string(),
      username: z.string(),
      phone: z.string().optional(),
      status: z.enum(["actif", "suspendu"]),
    }),
  )
  .handler(async ({ data }) => {
    const { user: admin, tenantId } = await getAdminTenantContext();
    try {
      await assertRoleInTenant(data.role_id, tenantId);
    } catch (error) {
      await logRejectedPrivilegeAttempt(admin.id, "role_not_allowed", {
        requestedRoleId: data.role_id, tenantId, operation: "create_user",
      });
      throw error;
    }

    const { data: authData, error: authError } = await (supabaseAdmin.auth.admin as any).createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        full_name: data.full_name,
        username: data.username,
        phone: data.phone,
        tenant_id: tenantId,
      },
    });

    if (authError) throw new Error(formatSupabaseError(authError));

    const { error: profileError } = await (supabaseAdmin as any).from("profiles").upsert({
      id: authData.user.id,
      email: data.email,
      full_name: data.full_name,
      username: data.username,
      phone: data.phone,
      tenant_id: tenantId,
      role_id: data.role_id,
      status: toDbStatus(data.status),
    });

    if (profileError) {
      await (supabaseAdmin.auth.admin as any).deleteUser(authData.user.id);
      throw new Error(formatSupabaseError(profileError));
    }

    await logAction(admin.id, null, "Création d'utilisateur", "utilisateurs", {
      targetUserId: authData.user.id,
      tenantId,
    });
    return { success: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      role_id: z.string().uuid().optional(),
      status: z.enum(["actif", "suspendu"]).optional(),
      full_name: z.string().optional(),
      username: z.string().optional(),
      phone: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { user: admin, tenantId } = await getAdminTenantContext();
    await assertProfileInTenant(data.id, tenantId);
    if (data.role_id && admin.id === data.id) {
      await logRejectedPrivilegeAttempt(admin.id, "self_role_change", {
        requestedRoleId: data.role_id, tenantId, operation: "update_user",
      });
      throw new Error("Vous ne pouvez pas modifier votre propre rôle.");
    }
    if (data.role_id) {
      try {
        await assertRoleInTenant(data.role_id, tenantId);
      } catch (error) {
        await logRejectedPrivilegeAttempt(admin.id, "role_not_allowed", {
          targetUserId: data.id, requestedRoleId: data.role_id,
          tenantId, operation: "update_user",
        });
        throw error;
      }
    }

    const { error } = await (supabaseAdmin as any)
      .from("profiles")
      .update({
        role_id: data.role_id,
        status: data.status ? toDbStatus(data.status) : undefined,
        full_name: data.full_name,
        username: data.username,
        phone: data.phone,
      })
      .eq("id", data.id)
      .eq("tenant_id", tenantId);

    if (error) throw new Error(formatSupabaseError(error));

    await logAction(admin.id, null, "Mise à jour d'utilisateur", "utilisateurs", {
      targetUserId: data.id,
      tenantId,
    });
    return { success: true };
  });

export const toggleStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), status: z.enum(["actif", "suspendu"]) }))
  .handler(async ({ data }) => {
    const { user: admin, tenantId } = await getAdminTenantContext();
    await assertProfileInTenant(data.id, tenantId);

    const { error } = await (supabaseAdmin as any)
      .from("profiles")
      .update({ status: toDbStatus(data.status) })
      .eq("id", data.id)
      .eq("tenant_id", tenantId);
    if (error) throw new Error(formatSupabaseError(error));

    await logAction(admin.id, null, "Changement de statut", "utilisateurs", {
      targetUserId: data.id,
      tenantId,
    });
    return { success: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { user: admin, tenantId } = await getAdminTenantContext();
    await assertProfileInTenant(data.id, tenantId);

    const { data: profile, error: profileError } = await (supabaseAdmin as any)
      .from("profiles")
      .select("email")
      .eq("id", data.id)
      .eq("tenant_id", tenantId)
      .single();
    if (profileError) throw new Error(formatSupabaseError(profileError));
    if (!profile?.email) throw new Error("Utilisateur ou adresse e-mail introuvable.");

    const { error } = await (supabaseAdmin.auth.admin as any).generateLink({
      type: "recovery",
      email: profile.email,
    });
    if (error) throw new Error(formatSupabaseError(error));

    await logAction(admin.id, null, "Réinitialisation de mot de passe", "utilisateurs", {
      targetUserId: data.id,
      tenantId,
    });
    return { success: true };
  });

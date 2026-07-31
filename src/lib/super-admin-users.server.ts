import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { formatSupabaseError } from "@/lib/supabase-error";

const PAGE_SIZE = 30;
const statusSchema = z.enum(["active", "suspended", "archived"]);

const querySchema = z.object({
  page: z.number().int().positive().default(1),
  search: z.string().trim().max(120).default(""),
  tenantId: z.string().uuid().optional(),
  roleId: z.string().uuid().optional(),
  status: statusSchema.optional(),
  sort: z.enum(["name", "tenant", "created_at", "last_login_at"]).default("name"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

const mutationSchema = z.object({
  userId: z.string().uuid(),
  action: z.enum(["suspend", "reactivate", "revoke_sessions"]),
  reason: z.string().trim().max(500).optional(),
});

const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  redirectTo: z.string().url().refine((value) => {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && url.pathname === "/reset-password";
  }, "URL de redirection de réinitialisation invalide."),
});

type RelatedRow = { id: string; name: string };
type ProfileRow = {
  id: string;
  tenant_id: string | null;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  status: string | null;
  created_at: string;
  last_login_at: string | null;
  roles: RelatedRow | RelatedRow[] | null;
  tenants: RelatedRow | RelatedRow[] | null;
};

export type TenantUser = {
  id: string;
  tenantId: string | null;
  tenantName: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
  isSelf: boolean;
};

export type AllTenantUsersResult = {
  users: TenantUser[];
  tenants: RelatedRow[];
  roles: RelatedRow[];
  stats: { total: number; active: number; suspended: number; tenants: number };
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

async function assertPlatformAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(formatSupabaseError(error));
  if (!data) throw new Error("Accès refusé : super administrateur de plateforme requis.");
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] ?? null : value;
}

function applyFilters(query: any, data: z.infer<typeof querySchema>) {
  if (data.tenantId) query = query.eq("tenant_id", data.tenantId);
  if (data.roleId) query = query.eq("role_id", data.roleId);
  if (data.status) {
    query = query.eq("status", data.status);
  }
  const safeSearch = data.search.replace(/[%_,()]/g, " ").trim();
  if (safeSearch) {
    query = query.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
  }
  return query;
}

async function writeAudit(
  admin: any,
  actorId: string,
  targetUserId: string,
  tenantId: string | null,
  action: string,
  reason?: string,
) {
  const { error } = await admin.from("audit_logs").insert({
    user_id: actorId,
    action,
    module: "super_admin_users",
    entity_id: targetUserId,
    metadata: {
      actor_id: actorId,
      target_user_id: targetUserId,
      tenant_id: tenantId,
      action,
      occurred_at: new Date().toISOString(),
      reason: reason || null,
    },
  });
  if (error) throw new Error(formatSupabaseError(error));
}

export const listAllTenantUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(querySchema)
  .handler(async ({ context, data }): Promise<AllTenantUsersResult> => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const from = (data.page - 1) * PAGE_SIZE;
    const sortColumn = {
      name: "full_name",
      tenant: "tenant_id",
      created_at: "created_at",
      last_login_at: "last_login_at",
    }[data.sort];

    let profilesQuery = supabaseAdmin
      .from("profiles")
      .select(
        "id, tenant_id, full_name, email, avatar_url, status, created_at, last_login_at, roles(id, name), tenants(id, name)",
        { count: "exact" },
      );
    profilesQuery = applyFilters(profilesQuery, data);

    let activeQuery = supabaseAdmin.from("profiles").select("id", { count: "exact", head: true });
    let suspendedQuery = supabaseAdmin.from("profiles").select("id", { count: "exact", head: true });
    let representedQuery = supabaseAdmin.from("profiles").select("tenant_id");
    activeQuery = applyFilters(activeQuery, { ...data, status: undefined }).eq("status", "active");
    suspendedQuery = applyFilters(suspendedQuery, { ...data, status: undefined }).eq("status", "suspended");
    representedQuery = applyFilters(representedQuery, data);

    const [profilesResult, tenantsResult, rolesResult, activeResult, suspendedResult, representedResult] =
      await Promise.all([
        profilesQuery
          .order(sortColumn, { ascending: data.direction === "asc", nullsFirst: false })
          .range(from, from + PAGE_SIZE - 1),
        supabaseAdmin.from("tenants").select("id, name").is("deleted_at", null).order("name"),
        supabaseAdmin.from("roles").select("id, name").order("name"),
        activeQuery,
        suspendedQuery,
        representedQuery,
      ]);

    for (const result of [
      profilesResult,
      tenantsResult,
      rolesResult,
      activeResult,
      suspendedResult,
      representedResult,
    ]) {
      if (result.error) throw new Error(formatSupabaseError(result.error));
    }

    const users = await Promise.all(
      ((profilesResult.data ?? []) as unknown as ProfileRow[]).map(async (profile) => {
        const { data: authResult, error: authError } =
          await supabaseAdmin.auth.admin.getUserById(profile.id);
        if (authError && !profile.email) throw new Error(formatSupabaseError(authError));
        const authUser = authResult.user;
        return {
          id: profile.id,
          tenantId: profile.tenant_id,
          tenantName: one(profile.tenants)?.name ?? "Sans tenant",
          fullName:
            profile.full_name?.trim() ||
            String(authUser?.user_metadata?.full_name ?? "").trim() ||
            "Utilisateur sans nom",
          email: authUser?.email ?? profile.email ?? "Adresse e-mail indisponible",
          avatarUrl: profile.avatar_url,
          role: one(profile.roles)?.name ?? "Sans rôle",
          status: profile.status ?? "inconnu",
          createdAt: authUser?.created_at ?? profile.created_at,
          lastLoginAt: authUser?.last_sign_in_at ?? profile.last_login_at,
          isSelf: profile.id === context.userId,
        };
      }),
    );

    const total = profilesResult.count ?? 0;
    const representedTenants = new Set(
      (representedResult.data ?? []).map((row) => row.tenant_id).filter(Boolean),
    ).size;
    return {
      users,
      tenants: tenantsResult.data ?? [],
      roles: rolesResult.data ?? [],
      stats: {
        total,
        active: activeResult.count ?? 0,
        suspended: suspendedResult.count ?? 0,
        tenants: representedTenants,
      },
      total,
      page: data.page,
      pageSize: PAGE_SIZE,
      pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    };
  });

export const mutateTenantUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(mutationSchema)
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) {
      throw new Error("Vous ne pouvez pas suspendre ou déconnecter votre propre compte.");
    }

    const { supabaseAdmin, revokeUserSessions } = await import(
      "@/integrations/supabase/client.server"
    );
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (profileError) throw new Error(formatSupabaseError(profileError));
    if (!profile) throw new Error("Utilisateur introuvable.");

    const actionName = {
      suspend: "user.suspended",
      reactivate: "user.reactivated",
      revoke_sessions: "user.sessions_revoked",
    }[data.action];

    if (data.action === "suspend") {
      const { error: banError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        ban_duration: "876000h",
      });
      if (banError) throw new Error("Impossible de suspendre l’accès de cet utilisateur.");

      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ status: "suspended", sessions_revoked_at: new Date().toISOString() })
        .eq("id", data.userId);
      if (error) {
        await supabaseAdmin.auth.admin.updateUserById(data.userId, { ban_duration: "none" });
        throw new Error("Impossible de suspendre cet utilisateur.");
      }
      await revokeUserSessions(data.userId);
    } else if (data.action === "reactivate") {
      const warnings: string[] = [];
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ status: "active", sessions_revoked_at: null })
        .eq("id", data.userId);
      if (error) {
        const { data: currentProfile, error: verificationError } = await supabaseAdmin
          .from("profiles")
          .select("status")
          .eq("id", data.userId)
          .maybeSingle();
        if (verificationError || currentProfile?.status !== "active") {
          throw new Error("Impossible de réactiver cet utilisateur.");
        }
        warnings.push("Le profil était déjà actif malgré l’échec de confirmation de la mise à jour.");
      }

      const { error: unbanError } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
        ban_duration: "none",
      });
      if (unbanError) {
        warnings.push("Le profil est actif, mais la suppression du bannissement Auth n’a pas pu être confirmée.");
      }

      try {
        await writeAudit(
          supabaseAdmin,
          context.userId,
          data.userId,
          profile.tenant_id,
          actionName,
          data.reason,
        );
      } catch {
        warnings.push("La réactivation a réussi, mais son écriture dans l’audit a échoué.");
      }
      return { success: true, userId: data.userId, warnings };
    } else {
      const { error } = await supabaseAdmin
        .from("profiles")
        .update({ sessions_revoked_at: new Date().toISOString() })
        .eq("id", data.userId);
      if (error) throw new Error("Impossible d’invalider les sessions de cet utilisateur.");
      await revokeUserSessions(data.userId);
    }

    await writeAudit(
      supabaseAdmin,
      context.userId,
      data.userId,
      profile.tenant_id,
      actionName,
      data.reason,
    );
    return { success: true, userId: data.userId };
  });

export const sendSuperAdminPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(resetPasswordSchema)
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: authResult, error: userError }, { data: profile, error: profileError }] =
      await Promise.all([
        supabaseAdmin.auth.admin.getUserById(data.userId),
        supabaseAdmin.from("profiles").select("tenant_id").eq("id", data.userId).maybeSingle(),
      ]);
    if (profileError) throw new Error(formatSupabaseError(profileError));
    if (userError || !authResult.user?.email) {
      throw new Error(userError ? formatSupabaseError(userError) : "Utilisateur introuvable.");
    }

    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      authResult.user.email,
      { redirectTo: data.redirectTo },
    );
    if (resetError) throw new Error(formatSupabaseError(resetError));
    await writeAudit(
      supabaseAdmin,
      context.userId,
      data.userId,
      profile?.tenant_id ?? null,
      "user.password_reset_requested",
    );
    return { success: true };
  });

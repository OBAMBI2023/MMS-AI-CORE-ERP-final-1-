import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { formatSupabaseError } from "@/lib/supabase-error";

const querySchema = z.object({
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(10).max(100).default(20),
  search: z.string().trim().max(120).default(""),
  role: z.string().uuid().optional(),
  status: z.enum(["actif", "suspendu", "archivé"]).optional(),
  sort: z.enum(["name", "created_at", "last_login_at"]).default("name"),
  direction: z.enum(["asc", "desc"]).default("asc"),
});

type ProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  status: string | null;
  created_at: string;
  last_login_at: string | null;
  roles: { id: string; name: string } | { id: string; name: string }[] | null;
};

export type MmsUser = {
  id: string;
  fullName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt: string | null;
};

export type MmsUsersResult = {
  users: MmsUser[];
  roles: { id: string; name: string }[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

const resetPasswordSchema = z.object({
  userId: z.string().uuid(),
  redirectTo: z.string().url().refine((value) => {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && url.pathname === "/reset-password";
  }, "URL de redirection de réinitialisation invalide."),
});

async function assertPlatformAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(formatSupabaseError(error));
  if (!data) throw new Error("Accès refusé : super administrateur de plateforme requis.");
}

export const getMmsUsers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(querySchema)
  .handler(async ({ context, data }): Promise<MmsUsersResult> => {
    const { data: membership, error: membershipError } = await context.supabase
      .from("platform_admins")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (membershipError) throw new Error(formatSupabaseError(membershipError));
    if (!membership) {
      throw new Error("Accès refusé : super administrateur de plateforme requis.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: tenant, error: tenantError } = await supabaseAdmin
      .from("tenants")
      .select("id")
      .eq("slug", "mms")
      .maybeSingle();
    if (tenantError) throw new Error(formatSupabaseError(tenantError));
    if (!tenant) throw new Error("Le tenant MMS est introuvable.");

    const { data: roles, error: rolesError } = await supabaseAdmin
      .from("roles")
      .select("id, name")
      .eq("tenant_id", tenant.id)
      .order("name");
    if (rolesError) throw new Error(formatSupabaseError(rolesError));

    const sortColumn = {
      name: "full_name",
      created_at: "created_at",
      last_login_at: "last_login_at",
    }[data.sort];
    const from = (data.page - 1) * data.pageSize;
    let query = supabaseAdmin
      .from("profiles")
      .select(
        "id, full_name, email, avatar_url, status, created_at, last_login_at, roles(id, name, tenant_id)",
        { count: "exact" },
      )
      .eq("tenant_id", tenant.id);

    if (data.role) query = query.eq("role_id", data.role);
    if (data.status) query = query.eq("status", data.status);
    if (data.search) {
      const safeSearch = data.search.replace(/[%_,()]/g, " ").trim();
      if (safeSearch) {
        query = query.or(`full_name.ilike.%${safeSearch}%,email.ilike.%${safeSearch}%`);
      }
    }

    const { data: profiles, count, error } = await query
      .order(sortColumn, {
        ascending: data.direction === "asc",
        nullsFirst: false,
      })
      .range(from, from + data.pageSize - 1);
    if (error) throw new Error(formatSupabaseError(error));

    const users = await Promise.all(
      ((profiles ?? []) as unknown as ProfileRow[]).map(async (profile) => {
        const { data: authResult, error: authError } =
          await supabaseAdmin.auth.admin.getUserById(profile.id);
        // A legacy/orphan profile remains visible from the business table even
        // when its Auth record no longer exists.
        if (authError && !profile.email) throw new Error(formatSupabaseError(authError));
        const authUser = authResult.user;
        const role = Array.isArray(profile.roles) ? profile.roles[0] : profile.roles;
        return {
          id: profile.id,
          fullName:
            profile.full_name?.trim() ||
            String(authUser?.user_metadata?.full_name ?? "").trim() ||
            "Utilisateur sans nom",
          email: authUser?.email ?? profile.email ?? "Adresse e-mail indisponible",
          avatarUrl: profile.avatar_url,
          role: role?.name ?? "Sans rôle",
          status: profile.status ?? "inconnu",
          createdAt: authUser?.created_at ?? profile.created_at,
          lastLoginAt: authUser?.last_sign_in_at ?? profile.last_login_at,
        };
      }),
    );

    const total = count ?? 0;
    return {
      users,
      roles: (roles ?? []).map((role) => ({ id: role.id, name: role.name })),
      total,
      page: data.page,
      pageSize: data.pageSize,
      pageCount: Math.max(1, Math.ceil(total / data.pageSize)),
    };
  });

export const sendSuperAdminPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(resetPasswordSchema)
  .handler(async ({ context, data }) => {
    await assertPlatformAdmin(context.supabase, context.userId);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: authResult, error: userError } =
      await supabaseAdmin.auth.admin.getUserById(data.userId);
    if (userError || !authResult.user?.email) {
      throw new Error(
        userError
          ? formatSupabaseError(userError)
          : "Utilisateur ou adresse e-mail introuvable.",
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("tenant_id")
      .eq("id", data.userId)
      .maybeSingle();
    if (profileError) throw new Error(formatSupabaseError(profileError));

    const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
      user_id: context.userId,
      action: "Envoi de réinitialisation de mot de passe",
      module: "super_admin_users",
      entity_id: data.userId,
      metadata: {
        target_user_id: data.userId,
        target_tenant_id: profile?.tenant_id ?? null,
      },
    });
    if (auditError) throw new Error(formatSupabaseError(auditError));

    // Supabase Auth generates and sends the official one-time recovery link.
    // This flow never reads, returns, stores, or handles a password value.
    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      authResult.user.email,
      { redirectTo: data.redirectTo },
    );
    if (resetError) throw new Error(formatSupabaseError(resetError));

    return { success: true };
  });

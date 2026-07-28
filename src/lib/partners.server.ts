import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { formatSupabaseError } from "@/lib/supabase-error";

type PartnerRow = {
  id: string;
  name: string;
  code: string;
  is_active: boolean;
  created_at: string;
};
type PartnerUserRow = { partner_id: string; user_id: string };
type PartnerTenantRow = { partner_id: string; tenant_id: string };
type TenantRow = { id: string; name: string; slug: string };

export type ManagedPartner = {
  id: string;
  userId: string;
  name: string;
  code: string;
  email: string;
  isActive: boolean;
  createdAt: string;
  tenantIds: string[];
};

export type PartnerManagementData = {
  partners: ManagedPartner[];
  tenants: TenantRow[];
};

async function requirePlatformAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(formatSupabaseError(error));
  if (!data) throw new Error("Accès refusé : Platform Admin requis.");
  return supabaseAdmin;
}

export const getPartnerManagement = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<PartnerManagementData> => {
    const admin = await requirePlatformAdmin(context.userId);
    const [partnersResult, usersResult, assignmentsResult, tenantsResult, authResult] =
      await Promise.all([
        admin.from("partners").select("id, name, code, is_active, created_at"),
        admin.from("partner_users").select("partner_id, user_id"),
        admin.from("partner_tenants").select("partner_id, tenant_id"),
        admin.from("tenants").select("id, name, slug").order("name"),
        admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      ]);
    for (const result of [partnersResult, usersResult, assignmentsResult, tenantsResult]) {
      if (result.error) throw new Error(formatSupabaseError(result.error));
    }
    if (authResult.error) throw new Error(formatSupabaseError(authResult.error));

    const memberships = (usersResult.data ?? []) as PartnerUserRow[];
    const assignments = (assignmentsResult.data ?? []) as PartnerTenantRow[];
    const authUsers = new Map(authResult.data.users.map((user) => [user.id, user]));
    const partners = ((partnersResult.data ?? []) as PartnerRow[]).map((partner) => {
      const membership = memberships.find((row) => row.partner_id === partner.id);
      const authUser = membership ? authUsers.get(membership.user_id) : undefined;
      return {
        id: partner.id,
        userId: membership?.user_id ?? "",
        name: partner.name,
        code: partner.code,
        email: authUser?.email ?? "",
        isActive: partner.is_active,
        createdAt: partner.created_at,
        tenantIds: assignments
          .filter((row) => row.partner_id === partner.id)
          .map((row) => row.tenant_id),
      };
    });
    return {
      partners: partners.sort((a, b) => a.name.localeCompare(b.name, "fr")),
      tenants: (tenantsResult.data ?? []) as TenantRow[],
    };
  });

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{1,49}$/),
  email: z.string().trim().email().max(254),
  password: z.string().min(12).max(128),
  tenantIds: z.array(z.string().uuid()).max(1000),
});

export const createPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(createSchema)
  .handler(async ({ context, data }) => {
    const admin = await requirePlatformAdmin(context.userId);
    const partnerId = crypto.randomUUID();
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      app_metadata: { platform_role: "partner" },
    });
    if (authError) throw new Error(formatSupabaseError(authError));
    try {
      const { error: partnerError } = await admin.rpc("create_partner_account", {
        requested_partner_id: partnerId,
        requested_user_id: authData.user.id,
        requested_name: data.name,
        requested_code: data.code,
        requested_actor_id: context.userId,
      });
      if (partnerError) throw new Error(formatSupabaseError(partnerError));
      const { error: assignmentError } = await admin.rpc("set_partner_tenants", {
        requested_partner_id: partnerId,
        requested_tenant_ids: [...new Set(data.tenantIds)],
        requested_actor_id: context.userId,
      });
      if (assignmentError) throw new Error(formatSupabaseError(assignmentError));
      return { success: true };
    } catch (error) {
      await admin.auth.admin.deleteUser(authData.user.id);
      throw error;
    }
  });

const updateSchema = z.object({
  partnerId: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  code: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9_-]{1,49}$/),
  email: z.string().trim().email().max(254),
  isActive: z.boolean(),
});

export const updatePartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(updateSchema)
  .handler(async ({ context, data }) => {
    const admin = await requirePlatformAdmin(context.userId);
    const { data: membership, error: membershipError } = await admin
      .from("partner_users")
      .select("user_id")
      .eq("partner_id", data.partnerId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (membershipError) throw new Error(formatSupabaseError(membershipError));
    if (!membership) throw new Error("Compte partenaire invalide.");

    if (!data.isActive) {
      const { error } = await admin.rpc("update_partner_account", {
        requested_partner_id: data.partnerId,
        requested_name: data.name,
        requested_code: data.code,
        requested_is_active: false,
        requested_actor_id: context.userId,
      });
      if (error) throw new Error(formatSupabaseError(error));
    }
    const { error: authError } = await admin.auth.admin.updateUserById(data.userId, {
      email: data.email,
      ban_duration: data.isActive ? "none" : "876000h",
      app_metadata: { platform_role: "partner" },
    });
    if (authError) throw new Error(formatSupabaseError(authError));
    if (data.isActive) {
      const { error } = await admin.rpc("update_partner_account", {
        requested_partner_id: data.partnerId,
        requested_name: data.name,
        requested_code: data.code,
        requested_is_active: true,
        requested_actor_id: context.userId,
      });
      if (error) throw new Error(formatSupabaseError(error));
    }
    return { success: true };
  });

export const setPartnerTenants = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    partnerId: z.string().uuid(),
    tenantIds: z.array(z.string().uuid()).max(1000),
  }))
  .handler(async ({ context, data }) => {
    const admin = await requirePlatformAdmin(context.userId);
    const { error } = await admin.rpc("set_partner_tenants", {
      requested_partner_id: data.partnerId,
      requested_tenant_ids: [...new Set(data.tenantIds)],
      requested_actor_id: context.userId,
    });
    if (error) throw new Error(formatSupabaseError(error));
    return { success: true };
  });

export const resetPartnerPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({
    partnerId: z.string().uuid(),
    userId: z.string().uuid(),
    password: z.string().min(12).max(128),
  }))
  .handler(async ({ context, data }) => {
    const admin = await requirePlatformAdmin(context.userId);
    const { data: membership, error: membershipError } = await admin
      .from("partner_users")
      .select("partner_id")
      .eq("partner_id", data.partnerId)
      .eq("user_id", data.userId)
      .maybeSingle();
    if (membershipError) throw new Error(formatSupabaseError(membershipError));
    if (!membership) throw new Error("Compte partenaire invalide.");
    const { error: passwordError } = await admin.auth.admin.updateUserById(data.userId, {
      password: data.password,
    });
    if (passwordError) throw new Error(formatSupabaseError(passwordError));
    const { error: logError } = await admin.from("partner_activity_logs").insert({
      partner_id: data.partnerId,
      user_id: context.userId,
      action: "partner.password_reset",
    });
    if (logError) throw new Error(formatSupabaseError(logError));
    return { success: true };
  });

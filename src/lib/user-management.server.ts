import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getAuth } from "@/lib/auth.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { logAction } from "@/lib/audit.server";

export const deleteUser = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { user: admin } = await getAuth();
    if (!admin) throw new Error("Unauthorized");

    if (admin.id === data.id) {
      throw new Error("Action non autorisée sur son propre compte");
    }

    const { count, error: countError } = await (supabaseAdmin as any)
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "actif")
      .neq("id", data.id);

    if (countError) throw countError;

    if (count === 0) {
      throw new Error("Impossible de supprimer le dernier administrateur actif.");
    }

    await logAction(admin.id, null, "Suppression d'utilisateur", "utilisateurs", { targetUserId: data.id });

    const { error } = await (supabaseAdmin.auth.admin as any).deleteUser(data.id);

    if (error) throw error;

    return { success: true };
  });

export const createUser = createServerFn({ method: "POST" })
  .validator(z.object({
    email: z.string().email(),
    password: z.string().min(6),
    role_id: z.string().uuid(),
    full_name: z.string(),
    username: z.string(),
    phone: z.string().optional(),
    status: z.enum(['actif', 'suspendu']),
  }))
  .handler(async ({ data }) => {
    const { user: admin } = await getAuth();
    if (!admin) throw new Error("Unauthorized");

    const { data: authData, error: authError } = await (supabaseAdmin.auth.admin as any).createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, username: data.username, phone: data.phone },
    });

    if (authError) throw authError;

    const { error: profileError } = await (supabaseAdmin as any).from("profiles").upsert({
      id: authData.user.id,
      email: data.email,
      full_name: data.full_name,
      username: data.username,
      phone: data.phone,
      role_id: data.role_id,
      status: data.status,
    });

    if (profileError) {
        await (supabaseAdmin.auth.admin as any).deleteUser(authData.user.id);
        throw profileError;
    }

    await logAction(admin.id, null, "Création d'utilisateur", "utilisateurs", { targetUserId: authData.user.id });
    return { success: true };
  });

export const updateUser = createServerFn({ method: "POST" })
  .validator(z.object({
    id: z.string().uuid(),
    role_id: z.string().uuid().optional(),
    status: z.enum(['actif', 'suspendu']).optional(),
    full_name: z.string().optional(),
    username: z.string().optional(),
    phone: z.string().optional(),
  }))
  .handler(async ({ data }) => {
    const { user: admin } = await getAuth();
    if (!admin) throw new Error("Unauthorized");

    const { error } = await (supabaseAdmin as any).from("profiles").update({
      role_id: data.role_id,
      status: data.status,
      full_name: data.full_name,
      username: data.username,
      phone: data.phone,
    }).eq('id', data.id);

    if (error) throw error;

    await logAction(admin.id, null, "Mise à jour d'utilisateur", "utilisateurs", { targetUserId: data.id });
    return { success: true };
  });

export const toggleStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), status: z.enum(['actif', 'suspendu']) }))
  .handler(async ({ data }) => {
    const { user: admin } = await getAuth();
    if (!admin) throw new Error("Unauthorized");

    const { error } = await (supabaseAdmin as any).from("profiles").update({ status: data.status }).eq('id', data.id);
    if (error) throw error;

    await logAction(admin.id, null, "Changement de statut", "utilisateurs", { targetUserId: data.id });
    return { success: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { user: admin } = await getAuth();
    if (!admin) throw new Error("Unauthorized");

    const { data: profile } = await (supabaseAdmin as any).from("profiles").select("email").eq("id", data.id).single();
    if (!profile) throw new Error("Utilisateur non trouvé");

    const { error } = await (supabaseAdmin.auth.admin as any).generateLink({
        type: 'recovery',
        email: profile.email,
    });
    if (error) throw error;

    await logAction(admin.id, null, "Réinitialisation de mot de passe", "utilisateurs", { targetUserId: data.id });
    return { success: true };
  });

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client.server";
import { getAuth } from "@/lib/auth.server"; // Assuming this exists

async function logActivity(
  adminId: string,
  affectedUserId: string,
  action: string,
  oldValue: any,
  newValue: any,
) {
  await supabase.from("activity_logs").insert({
    admin_id: adminId,
    affected_user_id: affectedUserId,
    action,
    old_value: oldValue,
    new_value: newValue,
  });
}

export const createUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      role_id: z.string().uuid(),
      full_name: z.string().optional(),
      username: z.string().optional(),
      phone: z.string().optional(),
      status: z.enum(["actif", "suspendu", "archivé"]).default("actif"),
    }),
  )
  .handler(async ({ data }) => {
    const { user: admin } = await getAuth();
    if (!admin) throw new Error("Unauthorized");

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, username: data.username },
    });
    if (authError) throw authError;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role_id: data.role_id,
        full_name: data.full_name,
        username: data.username,
        phone: data.phone,
        status: data.status,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    await logActivity(admin.id, authData.user.id, "Création d'utilisateur", null, data);

    return { id: authData.user.id };
  });

export const updateUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      role_id: z.string().uuid().optional(),
      status: z.string().optional(),
      full_name: z.string().optional(),
      username: z.string().optional(),
      phone: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { user: admin } = await getAuth();
    if (!admin) throw new Error("Unauthorized");
    
    // Security: Self-protection
    if (admin.id === data.id) throw new Error("Action non autorisée sur son propre compte");

    const { data: oldProfile } = await supabase.from("profiles").select("*").eq("id", data.id).single();

    const { error } = await supabase
      .from("profiles")
      .update({
        role_id: data.role_id,
        status: data.status,
        full_name: data.full_name,
        username: data.username,
        phone: data.phone,
      })
      .eq("id", data.id);
    if (error) throw error;

    await logActivity(admin.id, data.id, "Mise à jour d'utilisateur", oldProfile, data);

    return { success: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { user: admin } = await getAuth();
    if (!admin) throw new Error("Unauthorized");
    
    // Security: Self-protection
    if (admin.id === data.id) throw new Error("Action non autorisée sur son propre compte");

    const { error } = await supabase.auth.admin.deleteUser(data.id);
    if (error) throw error;

    await logActivity(admin.id, data.id, "Suppression d'utilisateur", null, null);

    return { success: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), password: z.string().min(8) }))
  .handler(async ({ data }) => {
    const { user: admin } = await getAuth();
    if (!admin) throw new Error("Unauthorized");

    const { error } = await supabase.auth.admin.updateUserById(data.id, {
      password: data.password,
    });
    if (error) throw error;
    
    await logActivity(admin.id, data.id, "Réinitialisation de mot de passe", null, null);

    return { success: true };
  });

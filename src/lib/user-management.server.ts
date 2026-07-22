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

    console.log("DEBUG: Appel Supabase - création Auth");
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, username: data.username },
    });
    if (authError) {
      console.log("DEBUG: Erreur création Auth:", authError);
      throw authError;
    }

    console.log("DEBUG: Appel Supabase - insertion base (profiles)");
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role_id: data.role_id,
        full_name: data.full_name,
        username: data.username,
        email: data.email,
        phone: data.phone,
        status: data.status,
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.log("DEBUG: Erreur insertion base:", profileError);
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }

    await logActivity(admin.id, authData.user.id, "Création d'utilisateur", null, data);

    console.log("DEBUG: Retour réussi de createUser pour:", authData.user.id);
    return { id: authData.user.id };
  });

export const updateUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      role_id: z.string().uuid().optional(),
      status: z.enum(["actif", "suspendu", "archivé"]).optional(),
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

    // Security: Prevent disabling last admin
    if (data.status === "suspendu") {
      const { count, error: countError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "actif")
        .neq("id", data.id);

      if (countError) throw countError;
      if (count === 0) throw new Error("Impossible de désactiver le dernier administrateur actif.");
    }

    const { data: oldProfile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", data.id)
      .single();

    const updateData: any = {};
    if (data.role_id) updateData.role_id = data.role_id;
    if (data.status) updateData.status = data.status;
    if (data.full_name) updateData.full_name = data.full_name;
    if (data.username) updateData.username = data.username;
    if (data.phone) updateData.phone = data.phone;

    const { error } = await supabase
      .from("profiles")
      .update(updateData)
      .eq("id", data.id);
    if (error) throw error;

    await logActivity(admin.id, data.id, "Mise à jour d'utilisateur", oldProfile, data);

    return { success: true };
  });

export const toggleStatus = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), status: z.enum(["actif", "suspendu"]) }))
  .handler(async ({ data }) => {
    const { user: admin } = await getAuth();
    if (!admin) throw new Error("Unauthorized");

    if (admin.id === data.id) throw new Error("Action non autorisée sur son propre compte");

    // Security: Prevent disabling last admin
    if (data.status === "suspendu") {
      const { count, error: countError } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("status", "actif")
        .neq("id", data.id);

      if (countError) throw countError;
      if (count === 0) throw new Error("Impossible de désactiver le dernier administrateur actif.");
    }

    const { error } = await supabase
      .from("profiles")
      .update({ status: data.status })
      .eq("id", data.id);
    if (error) throw error;

    await logActivity(admin.id, data.id, "Changement de statut", null, data.status);

    return { success: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { user: admin } = await getAuth();
    if (!admin) throw new Error("Unauthorized");

    // Security: Self-protection
    if (admin.id === data.id) throw new Error("Action non autorisée sur son propre compte");

    // Security: Prevent deleting last admin
    const { count, error: countError } = await supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "actif")
      .neq("id", data.id);

    if (countError) throw countError;
    if (count === 0) throw new Error("Impossible de supprimer le dernier administrateur actif.");

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

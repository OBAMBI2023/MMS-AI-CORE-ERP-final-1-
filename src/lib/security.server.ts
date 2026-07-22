import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { getAuth } from "@/lib/auth.server";

export const changePassword = createServerFn({ method: "POST" })
  .validator(z.object({ newPassword: z.string().min(8) }))
  .handler(async ({ data }) => {
    const { user } = await getAuth();
    if (!user) throw new Error("Unauthorized");

    // Update password using admin client to bypass RLS
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
      password: data.newPassword,
    });
    if (updateError) throw updateError;

    // Log activity in audit_logs
    await supabaseAdmin.from("audit_logs").insert({
      user_id: user.id,
      action: "Modification du mot de passe par l'utilisateur.",
      module: "Sécurité",
      metadata: { userId: user.id },
    });

    return { success: true };
  });

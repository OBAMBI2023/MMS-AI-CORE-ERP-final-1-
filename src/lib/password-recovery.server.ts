import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { getPasswordRedirectUrl } from "@/lib/app-url.server";
import { formatSupabaseError } from "@/lib/supabase-error";

const passwordRecoverySchema = z.object({ email: z.string().trim().email() });

export const sendPasswordRecoveryEmail = createServerFn({ method: "POST" })
  .validator(passwordRecoverySchema)
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.resetPasswordForEmail(data.email, {
      redirectTo: getPasswordRedirectUrl(),
    });
    if (error) throw new Error(formatSupabaseError(error));
    return { sent: true };
  });

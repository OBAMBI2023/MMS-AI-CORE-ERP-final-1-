import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin as supabase } from "@/integrations/supabase/client.server";

export const createUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      email: z.string().email(),
      password: z.string().min(8),
      role_id: z.string().uuid(),
      full_name: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name },
    });
    if (authError) throw authError;

    const { error: profileError } = await supabase
      .from("profiles")
      .update({ role_id: data.role_id, full_name: data.full_name })
      .eq("id", authData.user.id);
    if (profileError) throw profileError;

    return { id: authData.user.id };
  });

export const updateUser = createServerFn({ method: "POST" })
  .validator(
    z.object({
      id: z.string().uuid(),
      role_id: z.string().uuid().optional(),
      status: z.string().optional(),
      full_name: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        role_id: data.role_id,
        status: data.status,
        full_name: data.full_name,
      })
      .eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export const deleteUser = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { error } = await supabase.auth.admin.deleteUser(data.id);
    if (error) throw error;
    return { success: true };
  });

export const resetUserPassword = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string().uuid(), password: z.string().min(8) }))
  .handler(async ({ data }) => {
    const { error } = await supabase.auth.admin.updateUserById(data.id, {
      password: data.password,
    });
    if (error) throw error;
    return { success: true };
  });

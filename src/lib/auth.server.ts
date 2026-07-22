import { getRequest } from "@tanstack/react-start/server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export async function getAuth() {
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader) throw new Error("Unauthorized");

  const token = authHeader.replace("Bearer ", "");
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  
  if (error || !user) throw new Error("Unauthorized");

  return { user };
}

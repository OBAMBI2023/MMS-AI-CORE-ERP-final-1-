import { readEnvVar } from "@/integrations/supabase/env";

export function getPasswordRedirectUrl(): string {
  const appUrl = readEnvVar("APP_URL")?.trim();
  if (!appUrl) throw new Error("APP_URL est requis pour envoyer un lien d’authentification.");

  const publicUrl = new URL(appUrl);
  if (!["http:", "https:"].includes(publicUrl.protocol)) {
    throw new Error("APP_URL doit utiliser le protocole HTTP ou HTTPS.");
  }
  return new URL("/reset-password", publicUrl).toString();
}

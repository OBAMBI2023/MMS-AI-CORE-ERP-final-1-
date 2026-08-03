import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth, AuthHttpError } from "@/integrations/supabase/auth-middleware";
import { readEnvVar } from "@/integrations/supabase/env";
import { HOTEL_SMS_TYPES, normalizeIvorianPhone, type SMSProvider } from "./hotel-sms";

export class OrangeSmsProvider implements SMSProvider {
  readonly name = "orange";
  async send({ to, message, idempotencyKey }: { to: string; message: string; idempotencyKey: string }) {
    const endpoint = readEnvVar("ORANGE_SMS_API_URL"), token = readEnvVar("ORANGE_SMS_API_TOKEN"), sender = readEnvVar("ORANGE_SMS_SENDER");
    if (!endpoint || !token || !sender) throw new Error("Fournisseur SMS Orange non configuré.");
    const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", "Idempotency-Key": idempotencyKey }, body: JSON.stringify({ outboundSMSMessageRequest: { address: `tel:${to}`, senderAddress: sender, outboundSMSTextMessage: { message } } }) });
    const payload = await response.json().catch(() => ({})) as any;
    if (!response.ok) throw new Error(payload?.description || `Orange SMS HTTP ${response.status}`);
    return { status: "sent" as const, providerMessageId: payload?.resourceURL || payload?.messageId };
  }
}

const input = z.object({ reservationId: z.string().uuid(), messageType: z.enum(HOTEL_SMS_TYPES), message: z.string().trim().min(1).max(918) });
export const sendHotelSms = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth]).validator(input).handler(async ({ data, context }) => {
  const db = context.supabase as any;
  const { data: prepared, error } = await db.rpc("prepare_hotel_sms", { target_reservation_id: data.reservationId, sms_type: data.messageType, sms_message: data.message, sms_provider: "orange" });
  if (error) { if (error.code === "42501") throw new AuthHttpError(403, error.message); throw new Error(error.message || "Impossible de préparer le SMS."); }
  const row = Array.isArray(prepared) ? prepared[0] : prepared;
  if (!row?.log_id || !row?.phone) throw new Error("Réservation ou téléphone introuvable.");
  try {
    const phone = normalizeIvorianPhone(row.phone);
    const result = await new OrangeSmsProvider().send({ to: phone, message: data.message, idempotencyKey: row.log_id });
    await db.rpc("complete_hotel_sms", { target_log_id: row.log_id, final_status: result.status, external_id: result.providerMessageId ?? null, failure_message: null });
    return { id: row.log_id, status: result.status, phone };
  } catch (cause) {
    const failure = cause instanceof Error ? cause.message.slice(0, 500) : "Échec du fournisseur SMS";
    await db.rpc("complete_hotel_sms", { target_log_id: row.log_id, final_status: "failed", external_id: null, failure_message: failure });
    return { id: row.log_id, status: "failed" as const, phone: row.phone, error: failure };
  }
});

import { createServerFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { formatSupabaseError } from "@/lib/supabase-error";

// The generated Supabase types do not include the newly provisioned
// support_tickets/support_messages tables yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabase = any;

async function assertSuperAdmin(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("platform_admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(formatSupabaseError(error));
  if (!data) throw new Error("Accès refusé : super administrateur de plateforme requis.");
}

export const SUPPORT_CATEGORIES = [
  "Bug",
  "Question",
  "Facturation",
  "Demande de fonctionnalité",
  "Compte / Accès",
  "Autre",
] as const;
const supportCategorySchema = z.enum(SUPPORT_CATEGORIES);
const supportPrioritySchema = z.enum(["normal", "high", "urgent"]);
const supportStatusSchema = z.enum([
  "open",
  "in_progress",
  "waiting_customer",
  "resolved",
  "closed",
]);

export type SupportCategory = z.infer<typeof supportCategorySchema>;
export type SupportPriority = z.infer<typeof supportPrioritySchema>;
export type SupportStatus = z.infer<typeof supportStatusSchema>;

export type SuperAdminSupportTicket = {
  id: string;
  tenantId: string;
  tenantName: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  createdAt: string;
  updatedAt: string;
  lastMessageAt: string;
  unreadFromTenant: number;
  hasSupportReply: boolean;
};

export type SuperAdminSupportMessage = {
  id: string;
  senderType: "tenant" | "support";
  senderUserId: string;
  message: string;
  attachmentUrl: string | null;
  attachmentName: string | null;
  createdAt: string;
  readAt: string | null;
};

const listFiltersSchema = z.object({
  tenantId: z.string().uuid().optional(),
  status: supportStatusSchema.optional(),
  priority: supportPrioritySchema.optional(),
  category: supportCategorySchema.optional(),
});

export const listSupportTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(listFiltersSchema)
  .handler(async ({ context, data }): Promise<SuperAdminSupportTicket[]> => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as AnySupabase;

    let query = admin
      .from("support_tickets")
      .select(
        "id, tenant_id, subject, category, priority, status, created_at, updated_at, last_message_at, tenants(name)",
      )
      .order("last_message_at", { ascending: false });
    if (data.tenantId) query = query.eq("tenant_id", data.tenantId);
    if (data.status) query = query.eq("status", data.status);
    if (data.priority) query = query.eq("priority", data.priority);
    if (data.category) query = query.eq("category", data.category);

    const { data: ticketRows, error } = await query;
    if (error) throw new Error(formatSupabaseError(error));

    const ticketIds = (ticketRows ?? []).map((t: AnySupabase) => t.id);
    const statsByTicket = new Map<string, { unreadFromTenant: number; hasSupportReply: boolean }>();
    if (ticketIds.length) {
      const { data: messageRows, error: messagesError } = await admin
        .from("support_messages")
        .select("ticket_id, sender_type, read_at")
        .in("ticket_id", ticketIds);
      if (messagesError) throw new Error(formatSupabaseError(messagesError));
      for (const row of (messageRows ?? []) as AnySupabase[]) {
        const stats = statsByTicket.get(row.ticket_id) ?? {
          unreadFromTenant: 0,
          hasSupportReply: false,
        };
        if (row.sender_type === "tenant" && !row.read_at) stats.unreadFromTenant += 1;
        if (row.sender_type === "support") stats.hasSupportReply = true;
        statsByTicket.set(row.ticket_id, stats);
      }
    }

    return (ticketRows ?? []).map((t: AnySupabase) => {
      const stats = statsByTicket.get(t.id) ?? { unreadFromTenant: 0, hasSupportReply: false };
      return {
        id: t.id,
        tenantId: t.tenant_id,
        tenantName: t.tenants?.name ?? "—",
        subject: t.subject,
        category: t.category,
        priority: t.priority,
        status: t.status,
        createdAt: t.created_at,
        updatedAt: t.updated_at,
        lastMessageAt: t.last_message_at,
        unreadFromTenant: stats.unreadFromTenant,
        hasSupportReply: stats.hasSupportReply,
      };
    });
  });

export const getSupportTicketThread = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ ticketId: z.string().uuid() }))
  .handler(
    async ({
      context,
      data,
    }): Promise<{ ticket: SuperAdminSupportTicket; messages: SuperAdminSupportMessage[] }> => {
      await assertSuperAdmin(context.supabase, context.userId);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const admin = supabaseAdmin as AnySupabase;

      const { data: ticketRow, error: ticketError } = await admin
        .from("support_tickets")
        .select(
          "id, tenant_id, subject, category, priority, status, created_at, updated_at, last_message_at, tenants(name)",
        )
        .eq("id", data.ticketId)
        .maybeSingle();
      if (ticketError) throw new Error(formatSupabaseError(ticketError));
      if (!ticketRow) throw new Error("Ticket introuvable.");

      const { data: messageRows, error: messagesError } = await admin
        .from("support_messages")
        .select(
          "id, sender_type, sender_user_id, message, attachment_path, attachment_name, created_at, read_at",
        )
        .eq("ticket_id", data.ticketId)
        .order("created_at", { ascending: true });
      if (messagesError) throw new Error(formatSupabaseError(messagesError));

      const messages: SuperAdminSupportMessage[] = await Promise.all(
        ((messageRows ?? []) as AnySupabase[]).map(async (m) => {
          let attachmentUrl: string | null = null;
          if (m.attachment_path) {
            const { data: signed } = await supabaseAdmin.storage
              .from("support-attachments")
              .createSignedUrl(m.attachment_path, 60 * 60);
            attachmentUrl = signed?.signedUrl ?? null;
          }
          return {
            id: m.id,
            senderType: m.sender_type,
            senderUserId: m.sender_user_id,
            message: m.message,
            attachmentUrl,
            attachmentName: m.attachment_name,
            createdAt: m.created_at,
            readAt: m.read_at,
          };
        }),
      );

      return {
        ticket: {
          id: ticketRow.id,
          tenantId: ticketRow.tenant_id,
          tenantName: ticketRow.tenants?.name ?? "—",
          subject: ticketRow.subject,
          category: ticketRow.category,
          priority: ticketRow.priority,
          status: ticketRow.status,
          createdAt: ticketRow.created_at,
          updatedAt: ticketRow.updated_at,
          lastMessageAt: ticketRow.last_message_at,
          unreadFromTenant: 0,
          hasSupportReply: messages.some((m) => m.senderType === "support"),
        },
        messages,
      };
    },
  );

export const postSupportReply = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(z.object({ ticketId: z.string().uuid(), message: z.string().trim().min(1).max(5000) }))
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as AnySupabase;

    const { data: ticketRow, error: ticketError } = await admin
      .from("support_tickets")
      .select("id, tenant_id")
      .eq("id", data.ticketId)
      .maybeSingle();
    if (ticketError) throw new Error(formatSupabaseError(ticketError));
    if (!ticketRow) throw new Error("Ticket introuvable.");

    const { error: insertError } = await admin.from("support_messages").insert({
      ticket_id: data.ticketId,
      tenant_id: ticketRow.tenant_id,
      sender_user_id: context.userId,
      sender_type: "support",
      message: data.message,
    });
    if (insertError) throw new Error(formatSupabaseError(insertError));
    return { success: true };
  });

export const updateSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator(
    z.object({
      ticketId: z.string().uuid(),
      status: supportStatusSchema.optional(),
      priority: supportPrioritySchema.optional(),
    }),
  )
  .handler(async ({ context, data }) => {
    await assertSuperAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const admin = supabaseAdmin as AnySupabase;

    const update: Record<string, unknown> = {};
    if (data.status) update.status = data.status;
    if (data.priority) update.priority = data.priority;
    if (!Object.keys(update).length) return { success: true };

    const { error } = await admin.from("support_tickets").update(update).eq("id", data.ticketId);
    if (error) throw new Error(formatSupabaseError(error));
    return { success: true };
  });

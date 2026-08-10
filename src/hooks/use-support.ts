import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useTenant } from "@/providers/TenantProvider";

// The generated Supabase types do not include the newly provisioned
// support_tickets/support_messages tables yet.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export const SUPPORT_CATEGORIES = [
  "Bug",
  "Question",
  "Facturation",
  "Demande de fonctionnalité",
  "Compte / Accès",
  "Autre",
] as const;

export type SupportCategory = (typeof SUPPORT_CATEGORIES)[number];
export type SupportPriority = "normal" | "high" | "urgent";
export type SupportStatus = "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
export type SupportSenderType = "tenant" | "support";

export type SupportTicket = {
  id: string;
  tenant_id: string;
  created_by: string;
  subject: string;
  category: SupportCategory;
  priority: SupportPriority;
  status: SupportStatus;
  created_at: string;
  updated_at: string;
  last_message_at: string;
};

export type SupportMessage = {
  id: string;
  ticket_id: string;
  tenant_id: string;
  sender_user_id: string;
  sender_type: SupportSenderType;
  message: string;
  attachment_path: string | null;
  attachment_name: string | null;
  created_at: string;
  read_at: string | null;
};

function ticketsQueryKey(tenantId?: string | null) {
  return ["support-tickets", tenantId] as const;
}
function messagesQueryKey(tenantId?: string | null, ticketId?: string | null) {
  return ["support-messages", tenantId, ticketId] as const;
}
function unreadQueryKey(tenantId?: string | null) {
  return ["support-unread", tenantId] as const;
}

export function useSupportTickets() {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ticketsQueryKey(tenantId),
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await db
        .from("support_tickets")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("last_message_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as SupportTicket[];
    },
  });

  useEffect(() => {
    if (!tenantId) return;
    const refresh = () => {
      void qc.invalidateQueries({ queryKey: ticketsQueryKey(tenantId) });
      void qc.invalidateQueries({ queryKey: ["support-messages", tenantId] });
      void qc.invalidateQueries({ queryKey: unreadQueryKey(tenantId) });
    };
    const channel = supabase
      .channel(`support-tickets-${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_tickets",
          filter: `tenant_id=eq.${tenantId}`,
        },
        refresh,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "support_messages",
          filter: `tenant_id=eq.${tenantId}`,
        },
        refresh,
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tenantId, qc]);

  return query;
}

export function useSupportTicketMessages(ticketId?: string | null) {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  return useQuery({
    queryKey: messagesQueryKey(tenantId, ticketId),
    enabled: Boolean(tenantId && ticketId),
    queryFn: async () => {
      const { data, error } = await db
        .from("support_messages")
        .select("*")
        .eq("tenant_id", tenantId)
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as SupportMessage[];
    },
  });
}

/** Unread (support-authored, unread) message count per ticket — drives both
 * the per-ticket inbox badge and the sidebar's total unread badge. */
export function useSupportUnreadByTicket() {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  return useQuery({
    queryKey: unreadQueryKey(tenantId),
    enabled: Boolean(tenantId),
    queryFn: async () => {
      const { data, error } = await db
        .from("support_messages")
        .select("ticket_id")
        .eq("tenant_id", tenantId)
        .eq("sender_type", "support")
        .is("read_at", null);
      if (error) throw error;
      const counts = new Map<string, number>();
      for (const row of (data ?? []) as { ticket_id: string }[]) {
        counts.set(row.ticket_id, (counts.get(row.ticket_id) ?? 0) + 1);
      }
      return counts;
    },
    refetchInterval: 60_000,
  });
}

function useSupportRefresh(ticketId?: string | null) {
  const { profile } = useTenant();
  const tenantId = profile?.tenant_id;
  const qc = useQueryClient();
  return () => {
    void qc.invalidateQueries({ queryKey: ticketsQueryKey(tenantId) });
    void qc.invalidateQueries({ queryKey: messagesQueryKey(tenantId, ticketId) });
    void qc.invalidateQueries({ queryKey: unreadQueryKey(tenantId) });
  };
}

export function useCreateSupportTicket() {
  const refresh = useSupportRefresh();
  return useMutation({
    mutationFn: async (input: {
      subject: string;
      category: SupportCategory;
      priority: SupportPriority;
      message: string;
      attachmentPath?: string | null;
      attachmentName?: string | null;
    }) => {
      const { data, error } = await db.rpc("create_support_ticket", {
        requested_subject: input.subject,
        requested_category: input.category,
        requested_priority: input.priority,
        requested_message: input.message,
        requested_attachment_path: input.attachmentPath ?? null,
        requested_attachment_name: input.attachmentName ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: refresh,
  });
}

export function useReplySupportTicket(ticketId: string) {
  const refresh = useSupportRefresh(ticketId);
  return useMutation({
    mutationFn: async (input: {
      message: string;
      attachmentPath?: string | null;
      attachmentName?: string | null;
    }) => {
      const { data, error } = await db.rpc("reply_support_ticket", {
        requested_ticket_id: ticketId,
        requested_message: input.message,
        requested_attachment_path: input.attachmentPath ?? null,
        requested_attachment_name: input.attachmentName ?? null,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: refresh,
  });
}

export function useCloseSupportTicket(ticketId: string) {
  const refresh = useSupportRefresh(ticketId);
  return useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("close_support_ticket", { requested_ticket_id: ticketId });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useReopenSupportTicket(ticketId: string) {
  const refresh = useSupportRefresh(ticketId);
  return useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("reopen_support_ticket", { requested_ticket_id: ticketId });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

export function useMarkSupportMessagesRead(ticketId: string) {
  const refresh = useSupportRefresh(ticketId);
  return useMutation({
    mutationFn: async () => {
      const { error } = await db.rpc("mark_support_messages_read", {
        requested_ticket_id: ticketId,
      });
      if (error) throw error;
    },
    onSuccess: refresh,
  });
}

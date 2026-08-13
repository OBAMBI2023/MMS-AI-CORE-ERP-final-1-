import type { Database } from "@/integrations/supabase/types";

export type SubscriptionRow = Database["public"]["Tables"]["subscriptions"]["Row"];
export type SubscriptionStatus = Database["public"]["Enums"]["subscription_status"];
export type SubscriptionBillingCycle = Database["public"]["Enums"]["subscription_billing_cycle"];

const BILLING_CYCLE_LABELS: Record<SubscriptionBillingCycle, string> = {
  monthly: "Mensuel",
  quarterly: "Trimestriel",
  yearly: "Annuel",
};

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  trial: "Essai gratuit",
  active: "Actif",
  expired: "Expiré",
  suspended: "Suspendu",
};

export function subscriptionQueryKey(tenantId?: string | null) {
  return ["subscription", tenantId] as const;
}

export function formatSubscriptionStatus(status?: string | null) {
  return status && status in STATUS_LABELS ? STATUS_LABELS[status as SubscriptionStatus] : "Non défini";
}

export function formatBillingCycle(billingCycle?: string | null) {
  return billingCycle && billingCycle in BILLING_CYCLE_LABELS
    ? BILLING_CYCLE_LABELS[billingCycle as SubscriptionBillingCycle]
    : "Non définie";
}

export function subscriptionDaysRemaining(endsAt?: string | null) {
  if (!endsAt) return "Non définie";
  const diff = Math.ceil((new Date(endsAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return `${Math.max(0, diff)} jour${Math.max(0, diff) > 1 ? "s" : ""} restant${Math.max(0, diff) > 1 ? "s" : ""}`;
}

export function subscriptionDurationLabel(subscription: SubscriptionRow | null) {
  if (!subscription) return "Non définie";
  const start = subscription.status === "trial" ? subscription.trial_started_at : subscription.starts_at;
  const end = subscription.status === "trial" ? subscription.trial_ends_at : subscription.ends_at;
  if (!start || !end) return "Non définie";
  const days = Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24)));
  return `${days} jour${days > 1 ? "s" : ""}`;
}

export function subscriptionStartDate(subscription: SubscriptionRow | null) {
  if (!subscription) return null;
  return subscription.status === "trial" ? subscription.trial_started_at : subscription.starts_at;
}

export function subscriptionEndDate(subscription: SubscriptionRow | null) {
  if (!subscription) return null;
  return subscription.status === "trial" ? subscription.trial_ends_at : subscription.ends_at;
}

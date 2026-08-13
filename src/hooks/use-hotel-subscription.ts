import { useTenantSubscription } from "@/hooks/use-tenant-subscription";
import type { TenantSubscriptionRow } from "@/hooks/use-tenant-subscription";

export type HotelSubscriptionRow = TenantSubscriptionRow;

export function useHotelSubscription() {
  return useTenantSubscription();
}

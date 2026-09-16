// Data layer for the public (anonymous) SAOVIA Hôtel storefront
// (/hotel-vitrine, /hotel-vitrine/hotels, /hotel-vitrine/hotels/:slug).
//
// IMPORTANT — read before touching this file:
// - Uses the standard `supabase` client (same Supabase project as the Hotel
//   back-office), never the separate `restaurantSupabase` project.
// - `public.tenants.is_public` (migration 20260916090000) is the actual
//   publication flag: a tenant must opt in explicitly, being an active
//   HOTEL tenant is not sufficient by itself. The `.eq("is_public", true)`
//   filter below is explicit defense-in-depth on top of RLS — the anon
//   policies on `tenants`/`hotel_room_types` already enforce the identical
//   criteria (platform_type='HOTEL', is_active, deleted_at, suspended_at,
//   is_public) server-side, and also restrict which *columns* anon may
//   read at all (column-level GRANT, not just row-level RLS).
// - Never selects guest, reservation, financial, identity, or user data —
//   and structurally cannot: the `anon` role has no grant on those tables.
import { supabase } from "@/integrations/supabase/client";

export interface PublicHotelSummary {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  logoUrl: string | null;
  businessSector: string | null;
}

export interface PublicHotelRoomType {
  id: string;
  name: string;
  capacity: number | null;
  baseRate: number | null;
  amenities: string[];
}

export interface PublicHotelDetail extends PublicHotelSummary {
  address: string | null;
  phone: string | null;
  email: string | null;
  roomTypes: PublicHotelRoomType[];
}

const PUBLIC_TENANT_COLUMNS = "id, slug, name, city, logo_url, business_sector";
const PUBLIC_TENANT_DETAIL_COLUMNS = `${PUBLIC_TENANT_COLUMNS}, address, phone, email`;

function toSummary(row: {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  logo_url: string | null;
  business_sector: string | null;
}): PublicHotelSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    city: row.city,
    logoUrl: row.logo_url,
    businessSector: row.business_sector,
  };
}

/** Établissements hôtel publiables (V1 : is_active + non supprimé/suspendu). */
export async function fetchPublicHotels(): Promise<PublicHotelSummary[]> {
  const { data, error } = await supabase
    .from("tenants")
    .select(PUBLIC_TENANT_COLUMNS)
    .eq("platform_type", "HOTEL")
    .eq("is_active", true)
    .eq("is_public", true)
    .is("deleted_at", null)
    .is("suspended_at", null)
    .order("name", { ascending: true });

  if (error) {
    console.error("[Hotel vitrine] fetchPublicHotels failed", error.message);
    return [];
  }
  return (data ?? []).map(toSummary);
}

export async function fetchPublicHotelBySlug(slug: string): Promise<PublicHotelDetail | null> {
  const { data: tenant, error } = await supabase
    .from("tenants")
    .select(PUBLIC_TENANT_DETAIL_COLUMNS)
    .eq("slug", slug)
    .eq("platform_type", "HOTEL")
    .eq("is_active", true)
    .eq("is_public", true)
    .is("deleted_at", null)
    .is("suspended_at", null)
    .maybeSingle();

  if (error) {
    console.error("[Hotel vitrine] fetchPublicHotelBySlug failed", { slug, message: error.message });
    return null;
  }
  if (!tenant) return null;

  const { data: roomTypeRows, error: roomTypesError } = await supabase
    .from("hotel_room_types")
    .select("id, name, capacity, base_rate, amenities")
    .eq("tenant_id", tenant.id)
    .order("base_rate", { ascending: true });

  if (roomTypesError) {
    console.error("[Hotel vitrine] room types fetch failed", { slug, message: roomTypesError.message });
  }

  const roomTypes: PublicHotelRoomType[] = (roomTypeRows ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    capacity: row.capacity,
    baseRate: row.base_rate === null ? null : Number(row.base_rate),
    amenities: Array.isArray(row.amenities) ? (row.amenities as string[]) : [],
  }));

  return {
    ...toSummary(tenant),
    address: tenant.address,
    phone: tenant.phone,
    email: tenant.email,
    roomTypes,
  };
}

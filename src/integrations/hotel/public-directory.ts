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
//   policies on `tenants`/`hotel_rooms` already enforce the identical
//   criteria (platform_type='HOTEL', is_active, deleted_at, suspended_at,
//   is_public) server-side, and also restrict which *columns* anon may
//   read at all (column-level GRANT, not just row-level RLS).
// - Lodgings come from `hotel_rooms` (migration 20260916100000), the same
//   table the dashboard's "Chambres" CRUD manages — never a second/duplicate
//   table. Only `publication_status = 'published'` rows are visible here,
//   enforced both by this query and by the `hotel_rooms_public_read` RLS
//   policy. Cover photos are resolved via signed URLs against the private
//   `hotel-room-images` bucket, permitted for anon by the
//   `hotel room images public read` storage policy for exactly those rows.
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

export type PublicLodgingAvailability = "available" | "unavailable";

export interface PublicHotelLodging {
  id: string;
  name: string;
  description: string | null;
  propertyType: string | null;
  capacity: number | null;
  rate: number | null;
  amenities: string[];
  availability: PublicLodgingAvailability;
  photoUrl: string | null;
}

export interface PublicHotelDetail extends PublicHotelSummary {
  address: string | null;
  phone: string | null;
  email: string | null;
  description: string | null;
  whatsapp: string | null;
  lodgings: PublicHotelLodging[];
}

const PUBLIC_TENANT_COLUMNS = "id, slug, name, city, logo_url, business_sector";
const PUBLIC_TENANT_DETAIL_COLUMNS = `${PUBLIC_TENANT_COLUMNS}, address, phone, email, description, whatsapp`;
const IMAGE_BUCKET = "hotel-room-images";

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

  const { data: roomRows, error: roomsError } = await supabase
    .from("hotel_rooms")
    .select("id, number, description, capacity, rate, amenities, property_type, cover_image_path, status")
    .eq("tenant_id", tenant.id)
    .eq("publication_status", "published")
    .order("rate", { ascending: true });

  if (roomsError) {
    console.error("[Hotel vitrine] lodgings fetch failed", { slug, message: roomsError.message });
  }

  const rows = roomRows ?? [];
  const coverPaths = rows.map((row) => row.cover_image_path).filter((path): path is string => Boolean(path));
  let photoUrlByPath: Record<string, string> = {};
  if (coverPaths.length > 0) {
    const { data: signedUrls, error: signedUrlsError } = await supabase.storage
      .from(IMAGE_BUCKET)
      .createSignedUrls(coverPaths, 60 * 60);
    if (signedUrlsError) {
      console.error("[Hotel vitrine] lodging photo signing failed", { slug, message: signedUrlsError.message });
    } else {
      photoUrlByPath = Object.fromEntries(
        (signedUrls ?? []).filter((item) => item.signedUrl).map((item) => [item.path, item.signedUrl]),
      );
    }
  }

  const lodgings: PublicHotelLodging[] = rows.map((row) => ({
    id: row.id,
    name: row.number,
    description: row.description,
    propertyType: row.property_type,
    capacity: row.capacity,
    rate: row.rate === null ? null : Number(row.rate),
    amenities: Array.isArray(row.amenities) ? (row.amenities as string[]) : [],
    availability: row.status === "available" ? "available" : "unavailable",
    photoUrl: row.cover_image_path ? (photoUrlByPath[row.cover_image_path] ?? null) : null,
  }));

  return {
    ...toSummary(tenant),
    address: tenant.address,
    phone: tenant.phone,
    email: tenant.email,
    description: tenant.description,
    whatsapp: tenant.whatsapp,
    lodgings,
  };
}

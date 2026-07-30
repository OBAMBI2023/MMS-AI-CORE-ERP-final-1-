export interface TenantProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  tenant_id: string;
  role_id: string | null;
  avatar_url: string | null;
}

export interface Tenant {
  id: string;
  name?: string | null;
  business_activity?: string | null;
  [column: string]: unknown;
}

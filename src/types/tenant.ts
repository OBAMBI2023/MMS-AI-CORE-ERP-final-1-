export interface TenantProfile {
  id: string;
  email: string | null;
  tenant_id: string;
  role_id: string | null;
}

export interface Tenant {
  id: string;
  name?: string | null;
  business_activity?: string | null;
  [column: string]: unknown;
}

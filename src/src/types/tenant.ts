export interface TenantProfile {
  id: string;
  tenant_id: string;
  role_id: string | null;
  full_name: string | null;
  email: string | null;
  status: string | null;
}
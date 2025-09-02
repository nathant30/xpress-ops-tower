export type PiiScope = 'none'|'masked'|'full';

export interface RoleRecord {
  id: string;
  name: string;
  level: number;
  description?: string;
  permissions: string[];
  pii_scope: PiiScope;
  allowed_regions: string[];
  domain?: string;
  tenant_id?: string | null;
  country_code?: string | null;
  is_immutable: boolean;
  sensitive: boolean;
  created_at: string;
  updated_at: string;
  updated_by?: string | null;
}

export interface PendingChange {
  id: string;
  role_id: string;
  proposed_by: string;
  approver_id?: string | null;
  change: Partial<RoleRecord>;
  status: 'pending'|'approved'|'rejected'|'cancelled'|'expired';
  reason?: string | null;
  created_at: string;
  updated_at: string;
  expires_at?: string | null;
}

export interface RoleVersion {
  id: string;
  role_id: string;
  version: number;
  snapshot: RoleRecord;
  changed_by?: string | null;
  changed_at: string;
}

export interface UserRoleAssignment {
  user_id: string;
  role_id: string;
  assigned_at: string;
  assigned_by?: string | null;
  email: string;
  user_name: string;
}
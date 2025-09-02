import { query } from '@/lib/db';
import { RoleRecord } from '@/types/rbac';
import { XPRESS_ROLES } from '@/types/rbac-abac';

// SQLite compatibility adapter for the existing roles schema
export async function listRoles(): Promise<RoleRecord[]> {
  const { rows } = await query<any>(`
    SELECT role_id as id, name, display_name, level, is_active
    FROM roles
    ORDER BY level ASC, name ASC
  `);
  
  // Convert SQLite schema to RoleRecord format using XPRESS_ROLES as reference
  return rows.map(row => {
    const xpressRole = XPRESS_ROLES[row.name as keyof typeof XPRESS_ROLES];
    
    return {
      id: row.id.toString(),
      name: row.name,
      level: row.level,
      description: xpressRole?.displayName || row.display_name || '',
      permissions: xpressRole?.permissions || [],
      pii_scope: 'masked' as const,
      allowed_regions: [] as string[],
      domain: null,
      tenant_id: null,
      country_code: null,
      is_immutable: ['executive', 'iam_admin', 'ground_ops', 'support'].includes(row.name),
      sensitive: ['executive', 'iam_admin', 'ground_ops', 'support'].includes(row.name),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'system'
    } as RoleRecord;
  });
}

export async function getRole(id: string): Promise<RoleRecord | null> {
  const { rows } = await query<any>(`
    SELECT role_id as id, name, display_name, level, is_active
    FROM roles WHERE role_id = ?
  `, [id]);
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  const xpressRole = XPRESS_ROLES[row.name as keyof typeof XPRESS_ROLES];
  
  return {
    id: row.id.toString(),
    name: row.name,
    level: row.level,
    description: xpressRole?.displayName || row.display_name || '',
    permissions: xpressRole?.permissions || [],
    pii_scope: 'masked' as const,
    allowed_regions: [] as string[],
    domain: null,
    tenant_id: null,
    country_code: null,
    is_immutable: ['executive', 'iam_admin', 'ground_ops', 'support'].includes(row.name),
    sensitive: ['executive', 'iam_admin', 'ground_ops', 'support'].includes(row.name),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: 'system'
  } as RoleRecord;
}

export async function getRoleByName(name: string): Promise<RoleRecord | null> {
  const { rows } = await query<any>(`
    SELECT role_id as id, name, display_name, level, is_active
    FROM roles WHERE name = ?
  `, [name]);
  
  if (rows.length === 0) return null;
  
  const row = rows[0];
  const xpressRole = XPRESS_ROLES[row.name as keyof typeof XPRESS_ROLES];
  
  return {
    id: row.id.toString(),
    name: row.name,
    level: row.level,
    description: xpressRole?.displayName || row.display_name || '',
    permissions: xpressRole?.permissions || [],
    pii_scope: 'masked' as const,
    allowed_regions: [] as string[],
    domain: null,
    tenant_id: null,
    country_code: null,
    is_immutable: ['executive', 'iam_admin', 'ground_ops', 'support'].includes(row.name),
    sensitive: ['executive', 'iam_admin', 'ground_ops', 'support'].includes(row.name),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    updated_by: 'system'
  } as RoleRecord;
}

// Simplified implementations for SQLite compatibility
export async function createRole(input: Partial<RoleRecord>, userId: string): Promise<RoleRecord> {
  const { rows } = await query<any>(`
    INSERT INTO roles (name, display_name, level, is_active)
    VALUES (?, ?, ?, 1)
    RETURNING role_id as id, name, display_name, level, is_active
  `, [input.name, input.description || input.name, input.level]);
  
  return getRole(rows[0].id.toString())!;
}

export async function updateRoleDirect(id: string, patch: Partial<RoleRecord>, userId: string): Promise<RoleRecord> {
  const existing = await getRole(id);
  if (!existing) throw new Error('role_not_found');
  
  // Check if role is immutable
  if (existing.is_immutable) {
    // For immutable roles, return pending change (simplified for SQLite)
    return existing;
  }
  
  await query(`
    UPDATE roles SET
      display_name = ?,
      level = ?
    WHERE role_id = ?
  `, [
    patch.description || existing.description,
    patch.level || existing.level,
    id
  ]);
  
  return getRole(id)!;
}

export async function deleteRole(id: string): Promise<boolean> {
  const existing = await getRole(id);
  if (!existing || existing.is_immutable) {
    return false;
  }
  
  const { rows } = await query(`
    DELETE FROM roles WHERE role_id = ? AND name NOT IN ('executive', 'iam_admin', 'ground_ops', 'support')
    RETURNING role_id
  `, [id]);
  
  return rows.length > 0;
}

export async function searchRoles(searchTerm: string, limit = 50): Promise<RoleRecord[]> {
  const { rows } = await query<any>(`
    SELECT role_id as id, name, display_name, level, is_active
    FROM roles 
    WHERE name LIKE ? OR display_name LIKE ?
    ORDER BY level ASC, name ASC
    LIMIT ?
  `, [`%${searchTerm}%`, `%${searchTerm}%`, limit]);
  
  return rows.map(row => {
    const xpressRole = XPRESS_ROLES[row.name as keyof typeof XPRESS_ROLES];
    
    return {
      id: row.id.toString(),
      name: row.name,
      level: row.level,
      description: xpressRole?.displayName || row.display_name || '',
      permissions: xpressRole?.permissions || [],
      pii_scope: 'masked' as const,
      allowed_regions: [] as string[],
      domain: null,
      tenant_id: null,
      country_code: null,
      is_immutable: ['executive', 'iam_admin', 'ground_ops', 'support'].includes(row.name),
      sensitive: ['executive', 'iam_admin', 'ground_ops', 'support'].includes(row.name),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      updated_by: 'system'
    } as RoleRecord;
  });
}
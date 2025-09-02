import { query } from '@/lib/db';
import { RoleRecord } from '@/types/rbac';

export async function listRoles(): Promise<RoleRecord[]> {
  const { rows } = await query<RoleRecord>(`
    SELECT id, name, level, description, permissions, pii_scope, allowed_regions, domain,
           tenant_id, country_code, is_immutable, sensitive, created_at, updated_at, updated_by
    FROM rbac_roles
    ORDER BY level ASC, name ASC
  `);
  return rows;
}

export async function getRole(id: string): Promise<RoleRecord | null> {
  const { rows } = await query<RoleRecord>(`
    SELECT * FROM rbac_roles WHERE id = $1
  `, [id]);
  return rows[0] || null;
}

export async function getRoleByName(name: string): Promise<RoleRecord | null> {
  const { rows } = await query<RoleRecord>(`
    SELECT * FROM rbac_roles WHERE name = $1
  `, [name]);
  return rows[0] || null;
}

export async function createRole(input: Partial<RoleRecord>, userId: string): Promise<RoleRecord> {
  const { rows } = await query<RoleRecord>(`
    INSERT INTO rbac_roles (name, level, description, permissions, pii_scope, allowed_regions, domain,
                            tenant_id, country_code, is_immutable, sensitive, updated_by)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10,false),COALESCE($11,false),$12)
    RETURNING *
  `, [
    input.name, input.level, input.description ?? null, input.permissions ?? [],
    input.pii_scope ?? 'masked', input.allowed_regions ?? [], input.domain ?? null,
    input.tenant_id ?? null, input.country_code ?? null, input.is_immutable ?? false,
    input.sensitive ?? false, userId
  ]);
  return rows[0];
}

export async function updateRoleDirect(id: string, patch: Partial<RoleRecord>, userId: string): Promise<RoleRecord> {
  // Get existing role first
  const existing = await getRole(id);
  if (!existing) throw new Error('role_not_found');

  const next: Partial<RoleRecord> = {
    name: patch.name ?? existing.name,
    level: patch.level ?? existing.level,
    description: patch.description ?? existing.description,
    permissions: patch.permissions ?? existing.permissions,
    pii_scope: patch.pii_scope ?? existing.pii_scope,
    allowed_regions: patch.allowed_regions ?? existing.allowed_regions,
    domain: patch.domain ?? existing.domain,
    tenant_id: patch.tenant_id ?? existing.tenant_id,
    country_code: patch.country_code ?? existing.country_code,
    is_immutable: patch.is_immutable ?? existing.is_immutable,
    sensitive: patch.sensitive ?? existing.sensitive,
  };

  const { rows } = await query<RoleRecord>(`
    UPDATE rbac_roles SET
      name=$2, level=$3, description=$4, permissions=$5, pii_scope=$6, allowed_regions=$7,
      domain=$8, tenant_id=$9, country_code=$10, is_immutable=$11, sensitive=$12, updated_by=$13, updated_at=now()
    WHERE id=$1
    RETURNING *
  `, [
    id, next.name, next.level, next.description ?? null, next.permissions ?? [],
    next.pii_scope ?? 'masked', next.allowed_regions ?? [], next.domain ?? null,
    next.tenant_id ?? null, next.country_code ?? null, next.is_immutable ?? false,
    next.sensitive ?? false, userId
  ]);

  return rows[0];
}

export async function deleteRole(id: string): Promise<boolean> {
  const { rows } = await query(`
    DELETE FROM rbac_roles WHERE id = $1 AND is_immutable = FALSE
    RETURNING id
  `, [id]);
  
  return rows.length > 0;
}

export async function searchRoles(searchTerm: string, limit = 50): Promise<RoleRecord[]> {
  const { rows } = await query<RoleRecord>(`
    SELECT * FROM rbac_roles 
    WHERE name ILIKE $1 OR description ILIKE $1
    ORDER BY level ASC, name ASC
    LIMIT $2
  `, [`%${searchTerm}%`, limit]);
  
  return rows;
}
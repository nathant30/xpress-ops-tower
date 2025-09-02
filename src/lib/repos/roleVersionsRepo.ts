import { query } from '@/lib/db';
import { RoleRecord, RoleVersion } from '@/types/rbac';

export async function listVersions(roleId: string): Promise<RoleVersion[]> {
  const { rows } = await query<RoleVersion>(`
    SELECT id, role_id, version, snapshot, changed_by, changed_at
    FROM rbac_role_versions
    WHERE role_id = $1
    ORDER BY version DESC
  `, [roleId]);
  return rows;
}

export async function getVersion(versionId: string): Promise<RoleVersion | null> {
  const { rows } = await query<RoleVersion>(`
    SELECT * FROM rbac_role_versions WHERE id = $1
  `, [versionId]);
  return rows[0] || null;
}

export async function createVersionSnapshot(role: RoleRecord, changedBy?: string): Promise<RoleVersion> {
  const { rows } = await query<RoleVersion>(`
    INSERT INTO rbac_role_versions (role_id, version, snapshot, changed_by)
    VALUES (
      $1, 
      (SELECT COALESCE(MAX(version),0)+1 FROM rbac_role_versions WHERE role_id=$1), 
      $2::jsonb, 
      $3
    )
    RETURNING *
  `, [role.id, JSON.stringify(role), changedBy ?? null]);
  return rows[0];
}

export async function getLatestVersion(roleId: string): Promise<RoleVersion | null> {
  const { rows } = await query<RoleVersion>(`
    SELECT * FROM rbac_role_versions 
    WHERE role_id = $1 
    ORDER BY version DESC 
    LIMIT 1
  `, [roleId]);
  return rows[0] || null;
}

export async function getRoleAtVersion(roleId: string, version: number): Promise<RoleRecord | null> {
  const { rows } = await query<{snapshot: RoleRecord}>(`
    SELECT snapshot FROM rbac_role_versions 
    WHERE role_id = $1 AND version = $2
  `, [roleId, version]);
  
  return rows[0]?.snapshot || null;
}

export async function pruneOldVersions(roleId: string, keepVersions = 10): Promise<number> {
  const { rows } = await query(`
    DELETE FROM rbac_role_versions
    WHERE role_id = $1
      AND version NOT IN (
        SELECT version FROM rbac_role_versions 
        WHERE role_id = $1 
        ORDER BY version DESC 
        LIMIT $2
      )
    RETURNING id
  `, [roleId, keepVersions]);
  
  return rows.length;
}
import { query } from '@/lib/db';
import { PendingChange, RoleRecord } from '@/types/rbac';

export async function createPendingChange(
  roleId: string, 
  change: Partial<RoleRecord>, 
  userId: string, 
  reason?: string, 
  ttlMinutes = 240
): Promise<PendingChange> {
  const { rows } = await query<PendingChange>(`
    INSERT INTO rbac_role_pending_changes (role_id, proposed_by, change, reason, expires_at)
    VALUES ($1,$2,$3,$4, now() + ($5 || ' minutes')::interval)
    RETURNING *
  `, [roleId, userId, JSON.stringify(change), reason ?? null, ttlMinutes]);
  return rows[0];
}

export async function listPendingChanges(roleId?: string): Promise<PendingChange[]> {
  const { rows } = await query<PendingChange>(`
    SELECT pc.*, r.name as role_name, r.level as role_level
    FROM rbac_role_pending_changes pc
    JOIN rbac_roles r ON r.id = pc.role_id
    WHERE ($1::uuid IS NULL OR pc.role_id = $1)
      AND pc.status = 'pending'
      AND (pc.expires_at IS NULL OR pc.expires_at > now())
    ORDER BY pc.created_at DESC
  `, [roleId ?? null]);
  return rows;
}

export async function getPendingChange(id: string): Promise<PendingChange | null> {
  const { rows } = await query<PendingChange>(`
    SELECT * FROM rbac_role_pending_changes WHERE id = $1
  `, [id]);
  return rows[0] || null;
}

export async function approveChange(pendingId: string, approverId: string): Promise<void> {
  await query(`
    UPDATE rbac_role_pending_changes
       SET status='approved', approver_id=$2, updated_at=now()
     WHERE id=$1 AND status='pending'
  `, [pendingId, approverId]);
}

export async function rejectChange(pendingId: string, approverId: string, reason?: string): Promise<void> {
  await query(`
    UPDATE rbac_role_pending_changes
       SET status='rejected', approver_id=$2, reason=COALESCE($3, reason), updated_at=now()
     WHERE id=$1 AND status='pending'
  `, [pendingId, approverId, reason ?? null]);
}

export async function cancelChange(pendingId: string, userId: string): Promise<void> {
  await query(`
    UPDATE rbac_role_pending_changes
       SET status='cancelled', updated_at=now()
     WHERE id=$1 AND status='pending' AND proposed_by=$2
  `, [pendingId, userId]);
}

export async function expirePendingChanges(): Promise<number> {
  const { rows } = await query(`
    UPDATE rbac_role_pending_changes
       SET status='expired', updated_at=now()
     WHERE status='pending' AND expires_at < now()
     RETURNING id
  `);
  return rows.length;
}
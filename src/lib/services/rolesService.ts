import { getRole, updateRoleDirect } from '@/lib/repos/rolesRepo';
import { approveChange, createPendingChange, getPendingChange } from '@/lib/repos/roleApprovalsRepo';
import { createVersionSnapshot } from '@/lib/repos/roleVersionsRepo';
import { RoleRecord, PendingChange } from '@/types/rbac';
import { transaction } from '@/lib/db';

const BASELINE_ROLES = new Set(['ground_ops','support','executive','iam_admin']);

export async function updateRoleWithApprovals(
  roleId: string, 
  patch: Partial<RoleRecord>, 
  actorUserId: string, 
  reason?: string
): Promise<RoleRecord | PendingChange> {
  const role = await getRole(roleId);
  if (!role) throw new Error('role_not_found');

  const isBaseline = BASELINE_ROLES.has(role.name.toLowerCase());
  const needsApproval = role.sensitive || isBaseline || (role.level >= 60);

  if (needsApproval) {
    return await createPendingChange(roleId, patch, actorUserId, reason);
  } else {
    return await updateRoleDirect(roleId, patch, actorUserId);
  }
}

export async function applyApprovedChange(pendingId: string, approverUserId: string): Promise<RoleRecord> {
  return await transaction(async (query) => {
    // Mark as approved
    await approveChange(pendingId, approverUserId);
    
    // Get the pending change
    const pendingChange = await getPendingChange(pendingId);
    if (!pendingChange) throw new Error('pending_change_not_found');
    if (pendingChange.status !== 'approved') throw new Error('change_not_approved');
    
    // Get the current role
    const currentRole = await getRole(pendingChange.role_id);
    if (!currentRole) throw new Error('role_not_found');
    
    // Create version snapshot before applying changes
    await createVersionSnapshot(currentRole, approverUserId);
    
    // Apply the changes
    const mergedChanges = { ...pendingChange.change } as Partial<RoleRecord>;
    const updatedRole = await updateRoleDirect(pendingChange.role_id, mergedChanges, approverUserId);
    
    return updatedRole;
  });
}

export async function requiresApproval(roleId: string, patch: Partial<RoleRecord>): Promise<boolean> {
  const role = await getRole(roleId);
  if (!role) return false;

  const isBaseline = BASELINE_ROLES.has(role.name.toLowerCase());
  const isHighLevel = (role.level >= 60);
  const isSensitive = role.sensitive;
  
  // Check if the patch includes sensitive changes
  const hasSensitiveChanges = (
    patch.permissions && JSON.stringify(patch.permissions) !== JSON.stringify(role.permissions)
  ) || (
    patch.pii_scope && patch.pii_scope !== role.pii_scope
  ) || (
    patch.level && patch.level !== role.level
  );

  return isBaseline || isHighLevel || isSensitive || hasSensitiveChanges;
}

export async function bulkUpdateRoles(
  roleIds: string[], 
  patch: Partial<RoleRecord>, 
  actorUserId: string, 
  reason?: string
): Promise<{ updated: RoleRecord[], pending: PendingChange[] }> {
  const results = { updated: [] as RoleRecord[], pending: [] as PendingChange[] };
  
  for (const roleId of roleIds) {
    try {
      const result = await updateRoleWithApprovals(roleId, patch, actorUserId, reason);
      
      if ('status' in result && result.status === 'pending') {
        results.pending.push(result);
      } else {
        results.updated.push(result as RoleRecord);
      }
    } catch (error) {
      console.error(`Failed to update role ${roleId}:`, error);
      // Continue with other roles
    }
  }
  
  return results;
}

export async function safeDeleteRole(roleId: string, actorUserId: string): Promise<boolean> {
  const role = await getRole(roleId);
  if (!role) throw new Error('role_not_found');
  
  if (role.is_immutable) {
    throw new Error('cannot_delete_immutable_role');
  }
  
  if (BASELINE_ROLES.has(role.name.toLowerCase())) {
    throw new Error('cannot_delete_baseline_role');
  }
  
  // Check if role has users assigned
  const { query } = await import('@/lib/db');
  const { rows: userCount } = await query(`
    SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1
  `, [roleId]);
  
  if (parseInt(userCount[0].count) > 0) {
    throw new Error('role_has_assigned_users');
  }
  
  // Create a final version snapshot before deletion
  await createVersionSnapshot(role, actorUserId);
  
  // Soft delete by marking as inactive (or hard delete if preferred)
  const { rows } = await query(`
    DELETE FROM rbac_roles WHERE id = $1 RETURNING id
  `, [roleId]);
  
  return rows.length > 0;
}
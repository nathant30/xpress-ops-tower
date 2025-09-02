// Single Source of Truth for RBAC Capabilities
// Loads from config/allowed-actions.json at boot time
// Eliminates hardcoded if/else permission checks

import bundle from '../../../config/allowed-actions.json';

export type Role =
  | "ground_ops" | "ops_monitor" | "ops_manager" | "regional_manager"
  | "support" | "risk_investigator" | "finance_ops" | "hr_ops"
  | "executive" | "analyst" | "auditor" | "compliance_officer"
  | "iam_admin" | "app_admin" | "expansion_manager";

// Pre-compute role → permissions mapping for O(1) lookups
const allowed = new Map<Role, Set<string>>(
  Object.entries(bundle.allowed_actions).map(([role, actions]) => [
    role as Role, 
    new Set(actions as string[])
  ])
);

/**
 * Check if a role allows a specific action
 * This is the canonical permission check - replaces all hardcoded role logic
 */
export function roleAllows(role: Role, action: string): boolean {
  const permissionSet = allowed.get(role);
  return !!permissionSet && permissionSet.has(action);
}

/**
 * Get all permissions for a role (for debugging/audit)
 */
export function getRolePermissions(role: Role): string[] {
  const permissionSet = allowed.get(role);
  return permissionSet ? Array.from(permissionSet) : [];
}

/**
 * Check if user with multiple roles has permission for action
 */
export function userAllows(roles: Role[], action: string): boolean {
  return roles.some(role => roleAllows(role, action));
}

/**
 * Get all roles that allow a specific action (for reverse lookup)
 */
export function rolesAllowing(action: string): Role[] {
  const result: Role[] = [];
  for (const [role, permissions] of allowed.entries()) {
    if (permissions.has(action)) {
      result.push(role);
    }
  }
  return result;
}

// Export metadata for testing/validation
export const ROLE_METADATA = {
  totalRoles: bundle.metadata.total_roles,
  totalPermissions: bundle.metadata.total_permissions,
  version: bundle.metadata.version,
  allRoles: Array.from(allowed.keys()),
  allPermissions: Array.from(new Set(
    Object.values(bundle.allowed_actions).flat()
  )).sort()
};

// Validation on module load
if (allowed.size !== bundle.metadata.total_roles) {
  throw new Error(`Role count mismatch: expected ${bundle.metadata.total_roles}, got ${allowed.size}`);
}


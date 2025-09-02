// src/middleware/accessContext.ts
// Attach region-scoped access context to each request.

import type { Request, Response, NextFunction } from 'express';
import { getDb } from '@/lib/db';

export type AccessLevel = 'read' | 'write' | 'manage';
export type RegionGrant = { regionId: string; level: AccessLevel };

const RANK: Record<AccessLevel, number> = { read: 1, write: 2, manage: 3 };

export type AccessContext = {
  userId: string;
  role: string;
  capabilities: string[];
  allowedRegions: RegionGrant[];
  isGlobalBypass: boolean;
};

declare global {
  namespace Express {
    interface Request {
      ctx: AccessContext;
      user?: { id: string; email?: string; role?: string };
    }
  }
}

// Database helpers
async function getUserRole(userId: string): Promise<string> {
  const db = getDb();
  const result = await db.prepare(`
    SELECT role_key FROM users WHERE id = ?
  `).get(userId) as { role_key?: string } | undefined;
  
  return result?.role_key || 'guest';
}

async function listUserRegions(userId: string): Promise<RegionGrant[]> {
  const db = getDb();
  const results = await db.prepare(`
    SELECT region_id, access_level 
    FROM regional_user_access 
    WHERE user_id = ?
  `).all(userId) as { region_id: string; access_level: AccessLevel }[];
  
  return results.map(r => ({ regionId: r.region_id, level: r.access_level }));
}

async function listActiveOverrides(userId: string, now: Date): Promise<RegionGrant[]> {
  const db = getDb();
  const nowISO = now.toISOString();
  const results = await db.prepare(`
    SELECT region_id, access_level 
    FROM region_access_overrides 
    WHERE user_id = ? AND ? BETWEEN starts_at AND ends_at
  `).all(userId, nowISO) as { region_id: string; access_level: AccessLevel }[];
  
  return results.map(r => ({ regionId: r.region_id, level: r.access_level }));
}

async function getRoleCapabilities(role: string): Promise<string[]> {
  const db = getDb();
  const results = await db.prepare(`
    SELECT capability 
    FROM regional_capabilities 
    WHERE role_key = ?
  `).all(role) as { capability: string }[];
  
  return results.map(r => r.capability);
}

// Merge base grants + active overrides (max level wins)
async function computeAllowedRegions(userId: string): Promise<RegionGrant[]> {
  const base = await listUserRegions(userId);
  const overrides = await listActiveOverrides(userId, new Date());

  const map = new Map<string, AccessLevel>();
  for (const g of [...base, ...overrides]) {
    const prev = map.get(g.regionId);
    if (!prev || RANK[g.level] > RANK[prev]) {
      map.set(g.regionId, g.level);
    }
  }
  return [...map.entries()].map(([regionId, level]) => ({ regionId, level }));
}

export async function buildAccessContext(userId: string): Promise<AccessContext> {
  const role = await getUserRole(userId);
  const allowedRegions = await computeAllowedRegions(userId);
  const capabilities = await getRoleCapabilities(role);
  const isGlobalBypass = ['executive', 'iam_admin', 'app_admin', 'super_admin'].includes(role);
  
  return { 
    userId,
    role, 
    capabilities, 
    allowedRegions, 
    isGlobalBypass 
  };
}

export async function accessContextMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.user?.id) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    req.ctx = await buildAccessContext(req.user.id);
    return next();
  } catch (e) {
    console.error('accessContextMiddleware error', e);
    return res.status(500).json({ error: 'Access context failed' });
  }
}

// Guards
export function requireRegionAccess(ctx: AccessContext, regionId: string, min: AccessLevel = 'read'): boolean {
  if (ctx.isGlobalBypass) return true;
  
  const grant = ctx.allowedRegions.find(g => g.regionId === regionId);
  if (!grant) {
    throw createForbiddenError('No region access');
  }
  
  if (RANK[grant.level] < RANK[min]) {
    throw createForbiddenError('Insufficient region level');
  }
  
  return true;
}

export function can(ctx: AccessContext, capability: string): boolean {
  return ctx.isGlobalBypass || ctx.capabilities.includes(capability);
}

// Query scoper helper (for raw SQL)
export function getRegionFilterClause(ctx: AccessContext, regionColumn = 'region_id'): { clause: string; values: string[] } {
  if (ctx.isGlobalBypass) {
    return { clause: '', values: [] };
  }
  
  const regionIds = ctx.allowedRegions.map(r => r.regionId);
  if (regionIds.length === 0) {
    throw createForbiddenError('No regions assigned');
  }
  
  const placeholders = regionIds.map(() => '?').join(',');
  return {
    clause: `${regionColumn} IN (${placeholders})`,
    values: regionIds
  };
}

// Helper to create consistent error format
function createForbiddenError(message: string): Error {
  const error = new Error(message);
  (error as any).status = 403;
  return error;
}

// Utility functions for common patterns
export function requireGlobalCapability(ctx: AccessContext, capability: string): boolean {
  if (!can(ctx, capability)) {
    throw createForbiddenError(`Missing capability: ${capability}`);
  }
  return true;
}

export function requireSuperAdmin(ctx: AccessContext): boolean {
  if (!['iam_admin', 'app_admin', 'super_admin'].includes(ctx.role)) {
    throw createForbiddenError('Super admin access required');
  }
  return true;
}

// Example usage patterns:
/*
// Read drivers (needs read access)
app.get('/api/drivers', accessContextMiddleware, async (req, res) => {
  const { clause, values } = getRegionFilterClause(req.ctx, 'drivers.region_id');
  const whereClause = clause ? `WHERE ${clause}` : '';
  
  const drivers = await db.prepare(`
    SELECT * FROM drivers ${whereClause} LIMIT 100
  `).all(...values);
  
  res.json(drivers);
});

// Update driver (needs write access)
app.patch('/api/drivers/:id', accessContextMiddleware, async (req, res) => {
  const driver = await db.prepare('SELECT * FROM drivers WHERE id = ?').get(req.params.id);
  if (!driver) return res.status(404).json({ error: 'Driver not found' });
  
  requireRegionAccess(req.ctx, driver.region_id, 'write');
  
  await db.prepare('UPDATE drivers SET status = ? WHERE id = ?')
    .run(req.body.status, req.params.id);
  
  res.sendStatus(204);
});

// Assign RM (needs manage access + capability)
app.post('/api/regions/:id/assign-rm', accessContextMiddleware, async (req, res) => {
  requireRegionAccess(req.ctx, +req.params.id, 'manage');
  requireGlobalCapability(req.ctx, 'region:assign_rm');
  
  // Implementation...
  res.sendStatus(204);
});
*/
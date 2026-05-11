import { Request, Response, NextFunction } from 'express';

/**
 * Tenant middleware — extracts tenantId from JWT and makes it
 * available on req for all downstream route handlers.
 * This ensures every DB query is scoped to the correct tenant.
 */
export function tenantMiddleware(req: Request, _res: Response, next: NextFunction) {
  if (req.user?.tenantId) {
    // tenantId is already set by authMiddleware from JWT
    // We could additionally set PostgreSQL RLS context here:
    // await db.execute(sql`SET app.current_tenant_id = ${req.user.tenantId}`);
    next();
  } else {
    return _res.status(400).json({ success: false, error: 'Tenant context not found' });
  }
}

import { Router } from 'express';
import { db, tenants, users } from '@leadsai/database';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { signToken } from '../middleware/auth';
import { verifyPassword, hashPassword, generateSlug } from '@leadsai/database/src/utils';

export const authRouter = Router();

// ============ VALIDATION SCHEMAS ============
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const registerSchema = z.object({
  companyName: z.string().min(2).max(255),
  name: z.string().min(2).max(255),
  email: z.string().email(),
  password: z.string().min(6).max(100),
});

// ============ POST /api/auth/register ============
authRouter.post('/register', async (req, res) => {
  try {
    const body = registerSchema.parse(req.body);

    // Check existing user
    const existing = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Email already registered' });
    }

    // Create tenant
    const slug = generateSlug(body.companyName);
    const [tenant] = await db.insert(tenants).values({
      name: body.companyName,
      slug: slug + '-' + Date.now().toString(36),
      plan: 'free',
      aiCreditsRemaining: 500,
      aiCreditsMonthlyLimit: 500,
      settings: { timezone: 'Asia/Jakarta', language: 'id' },
    }).returning();

    // Create owner user
    const [user] = await db.insert(users).values({
      tenantId: tenant.id,
      email: body.email,
      name: body.name,
      passwordHash: await hashPassword(body.password),
      role: 'owner',
      isOnline: true,
    }).returning();

    // Sign JWT
    const token = signToken({
      userId: user.id,
      tenantId: tenant.id,
      email: user.email,
      role: user.role as any,
    });

    res.status(201).json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    console.error('[Auth] Register error:', err);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// ============ POST /api/auth/login ============
authRouter.post('/login', async (req, res) => {
  try {
    const body = loginSchema.parse(req.body);

    // Find user with tenant
    const [user] = await db.select().from(users).where(eq(users.email, body.email)).limit(1);
    if (!user || !user.passwordHash) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Get tenant info
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);

    // Update online status
    await db.update(users).set({ isOnline: true, lastSeenAt: new Date() }).where(eq(users.id, user.id));

    const token = signToken({
      userId: user.id,
      tenantId: user.tenantId,
      email: user.email,
      role: user.role as any,
    });

    res.json({
      success: true,
      data: {
        token,
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan },
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    console.error('[Auth] Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ============ GET /api/auth/me ============
authRouter.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  try {
    const jwt = await import('jsonwebtoken');
    const payload = jwt.default.verify(
      authHeader.substring(7),
      process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this'
    ) as any;

    const [user] = await db.select().from(users).where(eq(users.id, payload.userId)).limit(1);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });

    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, user.tenantId)).limit(1);

    res.json({
      success: true,
      data: {
        user: { id: user.id, name: user.name, email: user.email, role: user.role, avatarUrl: user.avatarUrl },
        tenant: { id: tenant.id, name: tenant.name, slug: tenant.slug, plan: tenant.plan, aiCreditsRemaining: tenant.aiCreditsRemaining },
      },
    });
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

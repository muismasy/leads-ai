import { Router } from 'express';
import { db, contacts } from '@leadsai/database';
import { eq, and, desc, ilike, or, count, sql } from 'drizzle-orm';
import { z } from 'zod';

export const contactsRouter = Router();

const createContactSchema = z.object({
  name: z.string().min(1).max(255),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  channel: z.string().default('whatsapp'),
  channelId: z.string(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.any()).optional(),
  notes: z.string().optional(),
});

// ============ GET /api/contacts — List contacts ============
contactsRouter.get('/', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { search, stage, tag, page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const conditions = [eq(contacts.tenantId, tenantId)];

    if (stage) conditions.push(eq(contacts.lifecycleStage, stage as string));
    if (search) {
      conditions.push(or(
        ilike(contacts.name, `%${search}%`),
        ilike(contacts.phone, `%${search}%`),
        ilike(contacts.email, `%${search}%`),
      )!);
    }

    const results = await db
      .select()
      .from(contacts)
      .where(and(...conditions))
      .orderBy(desc(contacts.updatedAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count() })
      .from(contacts)
      .where(and(...conditions));

    res.json({
      success: true,
      data: results,
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (err: any) {
    console.error('[Contacts] List error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch contacts' });
  }
});

// ============ GET /api/contacts/:id — Get single contact ============
contactsRouter.get('/:id', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const [contact] = await db.select().from(contacts)
      .where(and(eq(contacts.id, req.params.id), eq(contacts.tenantId, tenantId)))
      .limit(1);

    if (!contact) return res.status(404).json({ success: false, error: 'Contact not found' });
    res.json({ success: true, data: contact });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch contact' });
  }
});

// ============ POST /api/contacts — Create contact ============
contactsRouter.post('/', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const body = createContactSchema.parse(req.body);

    const [contact] = await db.insert(contacts).values({
      tenantId,
      ...body,
      tags: body.tags || [],
      customFields: body.customFields || {},
    }).returning();

    // 🚀 Trigger Workflow
    const redis = new (await import('ioredis')).default(process.env.REDIS_URL || 'redis://localhost:6379');
    await redis.rpush('platform_events_queue', JSON.stringify({
      tenantId,
      type: 'contact.created',
      payload: { contactId: contact.id, ...contact }
    }));

    res.status(201).json({ success: true, data: contact });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ success: false, error: err.errors[0].message });
    }
    res.status(500).json({ success: false, error: 'Failed to create contact' });
  }
});

// ============ PATCH /api/contacts/:id — Update contact ============
contactsRouter.patch('/:id', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { name, phone, email, tags, customFields, lifecycleStage, leadScore, notes } = req.body;

    const updates: any = { updatedAt: new Date() };
    if (name !== undefined) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (tags !== undefined) updates.tags = tags;
    if (customFields !== undefined) updates.customFields = customFields;
    if (lifecycleStage !== undefined) updates.lifecycleStage = lifecycleStage;
    if (leadScore !== undefined) updates.leadScore = leadScore;
    if (notes !== undefined) updates.notes = notes;

    const [updated] = await db.update(contacts).set(updates)
      .where(and(eq(contacts.id, req.params.id), eq(contacts.tenantId, tenantId)))
      .returning();

    if (!updated) return res.status(404).json({ success: false, error: 'Contact not found' });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update contact' });
  }
});

// ============ DELETE /api/contacts/:id — Delete contact ============
contactsRouter.delete('/:id', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const [deleted] = await db.delete(contacts)
      .where(and(eq(contacts.id, req.params.id), eq(contacts.tenantId, tenantId)))
      .returning();

    if (!deleted) return res.status(404).json({ success: false, error: 'Contact not found' });
    res.json({ success: true, message: 'Contact deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to delete contact' });
  }
});

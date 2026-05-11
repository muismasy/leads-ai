import { Router } from 'express';
import { db, deals, contacts } from '@leadsai/database';
import { eq, and, desc, count } from 'drizzle-orm';

export const dealsRouter = Router();

// GET /api/deals
dealsRouter.get('/', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { stage } = req.query;
    const conditions = [eq(deals.tenantId, tenantId)];
    if (stage) conditions.push(eq(deals.stage, stage as string));

    const results = await db.select({ deal: deals, contact: contacts })
      .from(deals)
      .innerJoin(contacts, eq(deals.contactId, contacts.id))
      .where(and(...conditions))
      .orderBy(desc(deals.updatedAt));

    res.json({ success: true, data: results.map(r => ({ ...r.deal, contact: r.contact })) });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to fetch deals' });
  }
});

// POST /api/deals
dealsRouter.post('/', async (req, res) => {
  try {
    const { contactId, title, value, currency, stage, assignedTo, expectedCloseDate } = req.body;
    const [deal] = await db.insert(deals).values({
      tenantId: req.user!.tenantId,
      contactId, title,
      value: value || '0',
      currency: currency || 'IDR',
      stage: stage || 'new',
      assignedTo: assignedTo || req.user!.userId,
      expectedCloseDate,
    }).returning();
    res.status(201).json({ success: true, data: deal });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to create deal' });
  }
});

// PATCH /api/deals/:id
dealsRouter.patch('/:id', async (req, res) => {
  try {
    const updates: any = { updatedAt: new Date() };
    for (const f of ['title', 'value', 'stage', 'probability', 'assignedTo', 'expectedCloseDate', 'lostReason']) {
      if (req.body[f] !== undefined) updates[f] = req.body[f];
    }
    const [updated] = await db.update(deals).set(updates)
      .where(and(eq(deals.id, req.params.id), eq(deals.tenantId, req.user!.tenantId)))
      .returning();
    if (!updated) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: 'Failed to update deal' });
  }
});

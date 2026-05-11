import { Router } from 'express';
import { db, conversations, contacts, messages } from '@leadsai/database';
import { eq, and, desc, ilike, sql, count } from 'drizzle-orm';
import { z } from 'zod';

export const conversationsRouter = Router();

// ============ GET /api/conversations — List conversations (Inbox) ============
conversationsRouter.get('/', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status, channel, search, page = '1', limit = '25' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    const conditions = [eq(conversations.tenantId, tenantId)];

    if (status && status !== 'all') {
      conditions.push(eq(conversations.status, status as string));
    }
    if (channel) {
      conditions.push(eq(conversations.channel, channel as string));
    }

    const results = await db
      .select({
        conversation: conversations,
        contact: contacts,
      })
      .from(conversations)
      .innerJoin(contacts, eq(conversations.contactId, contacts.id))
      .where(and(...conditions))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    // Get total count
    const [{ total }] = await db
      .select({ total: count() })
      .from(conversations)
      .where(and(...conditions));

    res.json({
      success: true,
      data: results.map(r => ({
        ...r.conversation,
        contact: r.contact,
      })),
      pagination: {
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        total,
        totalPages: Math.ceil(total / parseInt(limit as string)),
      },
    });
  } catch (err: any) {
    console.error('[Conversations] List error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch conversations' });
  }
});

// ============ GET /api/conversations/:id — Get single conversation ============
conversationsRouter.get('/:id', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;

    const results = await db
      .select({
        conversation: conversations,
        contact: contacts,
      })
      .from(conversations)
      .innerJoin(contacts, eq(conversations.contactId, contacts.id))
      .where(and(
        eq(conversations.id, req.params.id),
        eq(conversations.tenantId, tenantId)
      ))
      .limit(1);

    if (results.length === 0) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    res.json({
      success: true,
      data: { ...results[0].conversation, contact: results[0].contact },
    });
  } catch (err: any) {
    console.error('[Conversations] Get error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch conversation' });
  }
});

// ============ PATCH /api/conversations/:id — Update conversation ============
conversationsRouter.patch('/:id', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { status, assignedAgentId, priority, tags } = req.body;

    const updates: any = {};
    if (status) updates.status = status;
    if (assignedAgentId !== undefined) updates.assignedAgentId = assignedAgentId;
    if (priority) updates.priority = priority;
    if (tags) updates.tags = tags;
    if (status === 'closed') updates.closedAt = new Date();

    const [updated] = await db
      .update(conversations)
      .set(updates)
      .where(and(
        eq(conversations.id, req.params.id),
        eq(conversations.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // Emit real-time event
    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit('conversation:updated', updated);
    }

    res.json({ success: true, data: updated });
  } catch (err: any) {
    console.error('[Conversations] Update error:', err);
    res.status(500).json({ success: false, error: 'Failed to update conversation' });
  }
});

// ============ POST /api/conversations/:id/assign — Assign to agent (human takeover) ============
conversationsRouter.post('/:id/assign', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const agentId = req.body.agentId || req.user!.userId;

    const [updated] = await db
      .update(conversations)
      .set({
        assignedAgentId: agentId,
        status: 'human_active',
      })
      .where(and(
        eq(conversations.id, req.params.id),
        eq(conversations.tenantId, tenantId)
      ))
      .returning();

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`tenant:${tenantId}`).emit('conversation:updated', updated);
    }

    res.json({ success: true, data: updated, message: 'Agent assigned successfully' });
  } catch (err: any) {
    console.error('[Conversations] Assign error:', err);
    res.status(500).json({ success: false, error: 'Failed to assign agent' });
  }
});

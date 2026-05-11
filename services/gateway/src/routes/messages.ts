import { Router } from 'express';
import { db, messages, conversations } from '@leadsai/database';
import { eq, and, asc, desc, count } from 'drizzle-orm';
import { emitToConversation, emitToTenant } from '../socket';

export const messagesRouter = Router();

// ============ GET /api/messages/:conversationId — Get messages for a conversation ============
messagesRouter.get('/:conversationId', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const { page = '1', limit = '50' } = req.query;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Verify conversation belongs to tenant
    const [conv] = await db.select().from(conversations)
      .where(and(
        eq(conversations.id, req.params.conversationId),
        eq(conversations.tenantId, tenantId)
      ))
      .limit(1);

    if (!conv) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    const results = await db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, req.params.conversationId))
      .orderBy(asc(messages.createdAt))
      .limit(parseInt(limit as string))
      .offset(offset);

    const [{ total }] = await db
      .select({ total: count() })
      .from(messages)
      .where(eq(messages.conversationId, req.params.conversationId));

    // Reset unread count when agent views messages
    await db.update(conversations)
      .set({ unreadCount: 0 })
      .where(eq(conversations.id, req.params.conversationId));

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
    console.error('[Messages] List error:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch messages' });
  }
});

// ============ POST /api/messages/:conversationId — Send message (agent reply) ============
messagesRouter.post('/:conversationId', async (req, res) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const { content, contentType = 'text', mediaUrl } = req.body;

    if (!content && !mediaUrl) {
      return res.status(400).json({ success: false, error: 'Content or media is required' });
    }

    // Verify conversation belongs to tenant
    const [conv] = await db.select().from(conversations)
      .where(and(
        eq(conversations.id, req.params.conversationId),
        eq(conversations.tenantId, tenantId)
      ))
      .limit(1);

    if (!conv) {
      return res.status(404).json({ success: false, error: 'Conversation not found' });
    }

    // Insert message
    const [message] = await db.insert(messages).values({
      tenantId,
      conversationId: req.params.conversationId,
      senderType: 'agent',
      senderId: userId,
      content,
      contentType,
      mediaUrl,
      deliveryStatus: 'pending',
    }).returning();

    // Update conversation metadata
    await db.update(conversations).set({
      lastMessageAt: new Date(),
      lastMessagePreview: content?.substring(0, 100) || `[${contentType}]`,
      status: 'human_active',
      assignedAgentId: userId,
    }).where(eq(conversations.id, req.params.conversationId));

    // Emit real-time events
    const io = req.app.get('io');
    if (io) {
      emitToConversation(io, req.params.conversationId, 'message:new', message);
      emitToTenant(io, tenantId, 'conversation:updated', {
        id: conv.id,
        lastMessageAt: new Date(),
        lastMessagePreview: content?.substring(0, 100),
        status: 'human_active',
      });
    }

    // TODO: Actually send via channel connector (WA Gateway, IG API, etc.)
    // This will be implemented in Phase 4 when we connect channel-hub

    res.status(201).json({ success: true, data: message });
  } catch (err: any) {
    console.error('[Messages] Send error:', err);
    res.status(500).json({ success: false, error: 'Failed to send message' });
  }
});
